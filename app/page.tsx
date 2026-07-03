"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Role = "admin" | "driver";
type View = "home" | "drivers" | "vehicles";

type Driver = {
  id: string;
  driver_code: string;
  name: string;
  phone: string | null;
  line_id: string | null;
  license_expiry_date: string | null;
  status: string;
};

type Vehicle = {
  id: string;
  vehicle_code: string;
  plate_number: string;
  model: string;
  color: string | null;
  current_mileage: number;
  fuel_type: string | null;
  status: string;
};

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<Role>("driver");
  const [view, setView] = useState<View>("home");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tripCount, setTripCount] = useState(0);
  const [driverTripCount, setDriverTripCount] = useState(0);
  const [parkingCount, setParkingCount] = useState(0);
  const [cashCount, setCashCount] = useState(0);
  const [reminderCount, setReminderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [databaseError, setDatabaseError] = useState("");

  async function loadDrivers() {
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .order("driver_code", { ascending: true });

    if (error) {
      setDatabaseError(`读取司机失败：${error.message}`);
      return;
    }

    setDrivers(data ?? []);
  }

  async function loadVehicles() {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("vehicle_code", { ascending: true });

    if (error) {
      setDatabaseError(`读取车辆失败：${error.message}`);
      return;
    }

    setVehicles(data ?? []);
  }

  async function loadTripCount() {
    const { count, error } = await supabase
      .from("trips")
      .select("*", { count: "exact", head: true });

    if (error) {
      setDatabaseError(`读取行程数量失败：${error.message}`);
      return;
    }

    setTripCount(count ?? 0);
  }

  async function loadDriverTripCount() {
    const { data: driverData, error: driverError } = await supabase
      .from("drivers")
      .select("id")
      .eq("driver_code", "D001")
      .single();

    if (driverError || !driverData) {
      setDriverTripCount(0);
      return;
    }

    const { count, error } = await supabase
      .from("trips")
      .select("*", { count: "exact", head: true })
      .eq("driver_id", driverData.id);

    if (error) {
      setDatabaseError(`读取司机行程数量失败：${error.message}`);
      return;
    }

    setDriverTripCount(count ?? 0);
  }

  async function loadParkingCount() {
    const { count, error } = await supabase
      .from("parking_records")
      .select("*", { count: "exact", head: true });

    if (error) {
      setDatabaseError(`读取停车记录数量失败：${error.message}`);
      return;
    }

    setParkingCount(count ?? 0);
  }

  async function loadCashCount() {
    const { count, error } = await supabase
      .from("expenses")
      .select("*", { count: "exact", head: true })
      .eq("expense_type", "cash_collection");

    if (error) {
      setDatabaseError(`读取代收现金数量失败：${error.message}`);
      return;
    }

    setCashCount(count ?? 0);
  }

  async function loadReminderCount() {
    const [driverResult, vehicleResult] = await Promise.all([
      supabase
        .from("drivers")
        .select(`
          id,
          license_expiry_date,
          medical_check_date,
          next_medical_check_date,
          status
        `)
        .eq("status", "active"),

      supabase
        .from("vehicles")
        .select(`
          id,
          insurance_expiry_date,
          inspection_expiry_date,
          last_maintenance_date,
          next_maintenance_date,
          status
        `)
        .neq("status", "inactive"),
    ]);

    if (driverResult.error) {
      setDatabaseError(
        `读取司机到期资料失败：${driverResult.error.message}`
      );
      return;
    }

    if (vehicleResult.error) {
      setDatabaseError(
        `读取车辆到期资料失败：${vehicleResult.error.message}`
      );
      return;
    }

    const todayText = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const today = new Date(`${todayText}T00:00:00+09:00`);

    const daysLeft = (dateText: string) => {
      const due = new Date(`${dateText}T00:00:00+09:00`);

      return Math.ceil(
        (due.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      );
    };

    const addMonths = (dateText: string, months: number) => {
      const [year, month, day] = dateText.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));

      date.setUTCMonth(date.getUTCMonth() + months);

      return date.toISOString().slice(0, 10);
    };

    const addYears = (dateText: string, years: number) => {
      const [year, month, day] = dateText.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));

      date.setUTCFullYear(date.getUTCFullYear() + years);

      return date.toISOString().slice(0, 10);
    };

    let count = 0;

    for (const driver of driverResult.data ?? []) {
      if (
        driver.license_expiry_date &&
        daysLeft(driver.license_expiry_date) <= 30
      ) {
        count += 1;
      }

      const nextMedicalDate =
        driver.next_medical_check_date ||
        (driver.medical_check_date
          ? addYears(driver.medical_check_date, 1)
          : null);

      if (
        nextMedicalDate &&
        daysLeft(nextMedicalDate) <= 60
      ) {
        count += 1;
      }
    }

    for (const vehicle of vehicleResult.data ?? []) {
      const nextMaintenanceDate =
        vehicle.next_maintenance_date ||
        (vehicle.last_maintenance_date
          ? addMonths(vehicle.last_maintenance_date, 3)
          : null);

      if (
        nextMaintenanceDate &&
        daysLeft(nextMaintenanceDate) <= 15
      ) {
        count += 1;
      }

      if (
        vehicle.inspection_expiry_date &&
        daysLeft(vehicle.inspection_expiry_date) <= 30
      ) {
        count += 1;
      }

      if (
        vehicle.insurance_expiry_date &&
        daysLeft(vehicle.insurance_expiry_date) <= 30
      ) {
        count += 1;
      }
    }

    setReminderCount(count);
  }

  async function loadDatabase() {
    setLoading(true);
    setDatabaseError("");

    await Promise.all([
      loadDrivers(),
      loadVehicles(),
      loadTripCount(),
      loadDriverTripCount(),
      loadParkingCount(),
      loadCashCount(),
      loadReminderCount(),
    ]);

    setLoading(false);
  }

  useEffect(() => {
    loadDatabase();
  }, []);

  function login() {
    if (username === "admin" && password === "123456") {
      setRole("admin");
      setLoggedIn(true);
      setView("home");
      setLoginError("");
      return;
    }

    if (username === "D001" && password === "123456") {
      setRole("driver");
      setLoggedIn(true);
      setView("home");
      setLoginError("");
      return;
    }

    setLoginError("用户名或密码错误");
  }

  function logout() {
    setLoggedIn(false);
    setPassword("");
    setView("home");
  }

  if (!loggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-emerald-50 p-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500 text-3xl font-bold text-white">
              日
            </div>

            <h1 className="mt-5 text-3xl font-bold text-gray-900">
              日辰系统
            </h1>

            <p className="mt-2 text-sm tracking-widest text-gray-500">
              NICHISHIN SYSTEM
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="用户名"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-emerald-500"
            />

            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  login();
                }
              }}
              type="password"
              placeholder="密码"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-emerald-500"
            />

            {loginError && (
              <p className="text-center text-sm text-red-500">
                {loginError}
              </p>
            )}

            <button
              onClick={login}
              className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-white active:scale-95"
            >
              登录
            </button>
          </div>

          <div className="mt-6 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
            <p>管理员：admin / 123456</p>
            <p className="mt-1">司机：D001 / 123456</p>
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            © 日辰株式会社
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-emerald-50 p-5">
      <div className="mx-auto max-w-md">
        {view !== "home" && (
          <button
            onClick={() => setView("home")}
            className="mb-4 rounded-xl bg-white px-4 py-2 text-gray-700 shadow"
          >
            ← 返回首页
          </button>
        )}

        {databaseError && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-600">
            {databaseError}
          </div>
        )}

        {view === "home" && (
          <>
            <div className="rounded-3xl bg-emerald-500 p-6 text-white shadow-lg">
              <p className="text-sm opacity-80">
                {role === "admin" ? "管理员" : "司机"}
              </p>

              <h1 className="mt-2 text-2xl font-bold">
                欢迎使用日辰系统
              </h1>

              <p className="mt-2 text-sm">
                {role === "admin"
                  ? "admin · 日辰株式会社"
                  : "D001 · CAR001"}
              </p>
            </div>

            {loading ? (
              <div className="mt-5 rounded-2xl bg-white p-6 text-center shadow">
                正在读取数据库……
              </div>
            ) : role === "admin" ? (
              <div className="mt-5 grid grid-cols-2 gap-4">
                <MenuCard
                  title="司机管理"
                  value={`${drivers.length} 人`}
                  onClick={() => (window.location.href = "/drivers")}
                />

                <MenuCard
                  title="车辆管理"
                  value={`${vehicles.length} 台`}
                  onClick={() => setView("vehicles")}
                />

                <MenuCard
                  title="今日订单"
                  value={`${tripCount}`}
                  onClick={() => (window.location.href = "/trips")}
                />

                <MenuCard
                  title="停车记录"
                  value={`${parkingCount}`}
                  onClick={() => (window.location.href = "/admin-parking")}
                />

                <MenuCard
                  title="费用审核"
                  value={`${cashCount}`}
                  onClick={() => (window.location.href = "/admin-cash")}
                />

                <MenuCard
                  title="到期提醒"
                  value={`${reminderCount}`}
                  onClick={() => (window.location.href = "/reminders")}
                />
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-4">
                <MenuCard
                  title="我的行程"
                  value={`${driverTripCount}`}
                  onClick={() => (window.location.href = "/driver-trips")}
                />

                <MenuCard
                  title="当前车辆"
                  value={vehicles[0]?.vehicle_code ?? "未分配"}
                  onClick={() => setView("vehicles")}
                />

                <MenuCard
                  title="停车登记"
                  value="进入"
                  onClick={() => (window.location.href = "/parking")}
                />

                <MenuCard
                  title="代收现金"
                  value="¥0"
                  onClick={() => (window.location.href = "/cash-collection")}
                />
              </div>
            )}

            <button
              onClick={logout}
              className="mt-6 w-full rounded-xl bg-white py-3 font-semibold text-gray-700 shadow"
            >
              退出登录
            </button>
          </>
        )}

        {view === "drivers" && role === "admin" && (
          <DriverManager
            drivers={drivers}
            reloadDrivers={loadDrivers}
          />
        )}

        {view === "vehicles" && (
          <VehicleManager
            vehicles={vehicles}
            reloadVehicles={loadVehicles}
            canAdd={role === "admin"}
          />
        )}
      </div>
    </main>
  );
}

function MenuCard({
  title,
  value,
  onClick,
}: {
  title: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl bg-white p-5 text-left shadow transition active:scale-95"
    >
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
    </button>
  );
}

function DriverManager({
  drivers,
  reloadDrivers,
}: {
  drivers: Driver[];
  reloadDrivers: () => Promise<void>;
}) {
  const [driverCode, setDriverCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function addDriver() {
    if (!driverCode || !name) {
      setMessage("请至少填写司机编号和姓名");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("drivers").insert({
      driver_code: driverCode.toUpperCase(),
      name,
      phone: phone || null,
      line_id: lineId || null,
      license_expiry_date: licenseExpiry || null,
      status: "active",
    });

    if (error) {
      setMessage(`添加失败：${error.message}`);
      setSaving(false);
      return;
    }

    setDriverCode("");
    setName("");
    setPhone("");
    setLineId("");
    setLicenseExpiry("");
    setMessage("司机添加成功，已经永久保存");
    setSaving(false);

    await reloadDrivers();
  }

  return (
    <section>
      <h1 className="text-2xl font-bold text-gray-900">司机管理</h1>

      <div className="mt-4 rounded-2xl bg-white p-5 shadow">
        <h2 className="font-bold text-gray-900">添加司机</h2>

        <div className="mt-4 space-y-3">
          <input
            value={driverCode}
            onChange={(event) => setDriverCode(event.target.value)}
            placeholder="司机编号，例如 D002"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="司机姓名"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="电话号码"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            value={lineId}
            onChange={(event) => setLineId(event.target.value)}
            placeholder="LINE"
            className="w-full rounded-xl border px-4 py-3"
          />

          <div>
            <p className="mb-1 text-sm text-gray-500">驾照到期日</p>
            <input
              value={licenseExpiry}
              onChange={(event) => setLicenseExpiry(event.target.value)}
              type="date"
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          {message && (
            <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
              {message}
            </p>
          )}

          <button
            onClick={addDriver}
            disabled={saving}
            className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-white disabled:opacity-50"
          >
            {saving ? "正在保存……" : "添加司机"}
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {drivers.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 text-gray-500 shadow">
            暂无司机资料
          </div>
        ) : (
          drivers.map((driver) => (
            <div
              key={driver.id}
              className="rounded-2xl bg-white p-5 shadow"
            >
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-900">
                  {driver.driver_code} · {driver.name}
                </p>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-600">
                  {driver.status === "active" ? "在职" : driver.status}
                </span>
              </div>

              <p className="mt-2 text-sm text-gray-500">
                电话：{driver.phone || "未填写"}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                LINE：{driver.line_id || "未填写"}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                驾照到期：
                {driver.license_expiry_date || "未填写"}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function VehicleManager({
  vehicles,
  reloadVehicles,
  canAdd,
}: {
  vehicles: Vehicle[];
  reloadVehicles: () => Promise<void>;
  canAdd: boolean;
}) {
  const [vehicleCode, setVehicleCode] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [mileage, setMileage] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function addVehicle() {
    if (!vehicleCode || !plateNumber || !model) {
      setMessage("请至少填写车辆编号、车牌和车型");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("vehicles").insert({
      vehicle_code: vehicleCode.toUpperCase(),
      plate_number: plateNumber,
      model,
      color: color || null,
      current_mileage: Number(mileage || 0),
      fuel_type: fuelType || null,
      status: "active",
    });

    if (error) {
      setMessage(`添加失败：${error.message}`);
      setSaving(false);
      return;
    }

    setVehicleCode("");
    setPlateNumber("");
    setModel("");
    setColor("");
    setMileage("");
    setFuelType("");
    setMessage("车辆添加成功，已经永久保存");
    setSaving(false);

    await reloadVehicles();
  }

  return (
    <section>
      <h1 className="text-2xl font-bold text-gray-900">车辆管理</h1>

      {canAdd && (
        <div className="mt-4 rounded-2xl bg-white p-5 shadow">
          <h2 className="font-bold text-gray-900">添加车辆</h2>

          <div className="mt-4 space-y-3">
            <input
              value={vehicleCode}
              onChange={(event) => setVehicleCode(event.target.value)}
              placeholder="车辆编号，例如 CAR002"
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              value={plateNumber}
              onChange={(event) => setPlateNumber(event.target.value)}
              placeholder="车牌号码"
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="车型"
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              value={color}
              onChange={(event) => setColor(event.target.value)}
              placeholder="颜色"
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              value={mileage}
              onChange={(event) => setMileage(event.target.value)}
              type="number"
              placeholder="当前公里数"
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              value={fuelType}
              onChange={(event) => setFuelType(event.target.value)}
              placeholder="燃料类型，例如汽油"
              className="w-full rounded-xl border px-4 py-3"
            />

            {message && (
              <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                {message}
              </p>
            )}

            <button
              onClick={addVehicle}
              disabled={saving}
              className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-white disabled:opacity-50"
            >
              {saving ? "正在保存……" : "添加车辆"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {vehicles.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 text-gray-500 shadow">
            暂无车辆资料
          </div>
        ) : (
          vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="rounded-2xl bg-white p-5 shadow"
            >
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-900">
                  {vehicle.vehicle_code} · {vehicle.model}
                </p>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-600">
                  使用中
                </span>
              </div>

              <p className="mt-2 text-sm text-gray-500">
                车牌：{vehicle.plate_number}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                颜色：{vehicle.color || "未填写"}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                当前公里数：{vehicle.current_mileage} km
              </p>

              <p className="mt-1 text-sm text-gray-500">
                燃料：{vehicle.fuel_type || "未填写"}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
