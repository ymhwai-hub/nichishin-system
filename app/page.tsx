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

type DashboardTrip = {
  id: string;
  trip_number: string | null;
  trip_date: string | null;
  start_time: string | null;
  pickup_location: string | null;
  destination: string | null;
  status: string | null;
};


type DashboardReminder = {
  id: string;
  title: string;
  description: string;
  daysLeft: number;
  category: string;
  tone: "rose" | "amber" | "emerald";
};


export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<Role>("driver");
  const [view, setView] = useState<View>("home");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const savedLogin = window.localStorage.getItem("nichishin_login");

    if (!savedLogin) return;

    try {
      const saved = JSON.parse(savedLogin);

      if (saved.role === "admin" || saved.role === "driver") {
        setRole(saved.role);
        setUsername(
          saved.username ||
            (saved.role === "admin" ? "admin" : "D001")
        );
        setLoggedIn(true);
        setView("home");
      }
    } catch {
      window.localStorage.removeItem("nichishin_login");
    }
  }, []);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tripCount, setTripCount] = useState(0);
  const [driverTripCount, setDriverTripCount] = useState(0);
  const [parkingCount, setParkingCount] = useState(0);
  const [cashCount, setCashCount] = useState(0);
  const [reminderCount, setReminderCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [recentTrips, setRecentTrips] = useState<DashboardTrip[]>([]);
  const [dashboardReminders, setDashboardReminders] = useState<DashboardReminder[]>([]);
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

  async function loadCustomerCount() {
    const { count, error } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true });

    if (error) {
      setDatabaseError(`读取客户数量失败：${error.message}`);
      return;
    }

    setCustomerCount(count ?? 0);
  }

  async function loadRecentTrips() {
    const todayText = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const { data, error } = await supabase
      .from("trips")
      .select(`
        id,
        trip_number,
        trip_date,
        start_time,
        pickup_location,
        destination,
        status
      `)
      .gte("trip_date", todayText)
      .order("trip_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(12);

    if (error) {
      setDatabaseError(`读取近期行程失败：${error.message}`);
      return;
    }

    setRecentTrips((data as DashboardTrip[]) ?? []);
  }


  async function loadDashboardReminders() {
    const [driverResult, vehicleResult] = await Promise.all([
      supabase
        .from("drivers")
        .select(`
          id,
          driver_code,
          name,
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
          vehicle_code,
          plate_number,
          model,
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
        `读取司机提醒明细失败：${driverResult.error.message}`
      );
      return;
    }

    if (vehicleResult.error) {
      setDatabaseError(
        `读取车辆提醒明细失败：${vehicleResult.error.message}`
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

    const getTone = (left: number): "rose" | "amber" | "emerald" => {
      if (left <= 7) return "rose";
      if (left <= 30) return "amber";
      return "emerald";
    };

    const reminders: DashboardReminder[] = [];

    for (const driver of driverResult.data ?? []) {
      if (driver.license_expiry_date) {
        const left = daysLeft(driver.license_expiry_date);

        if (left <= 30) {
          reminders.push({
            id: `driver-license-${driver.id}`,
            title: `${driver.driver_code} · ${driver.name}`,
            description:
              left < 0
                ? `驾照已过期 ${Math.abs(left)} 天`
                : `驾照还有 ${left} 天到期`,
            daysLeft: left,
            category: "驾照",
            tone: getTone(left),
          });
        }
      }

      const nextMedicalDate =
        driver.next_medical_check_date ||
        (driver.medical_check_date
          ? addYears(driver.medical_check_date, 1)
          : null);

      if (nextMedicalDate) {
        const left = daysLeft(nextMedicalDate);

        if (left <= 60) {
          reminders.push({
            id: `driver-medical-${driver.id}`,
            title: `${driver.driver_code} · ${driver.name}`,
            description:
              left < 0
                ? `体检已超过 ${Math.abs(left)} 天`
                : `体检还有 ${left} 天需要安排`,
            daysLeft: left,
            category: "体检",
            tone: getTone(left),
          });
        }
      }
    }

    for (const vehicle of vehicleResult.data ?? []) {
      const vehicleTitle = `${vehicle.vehicle_code} · ${
        vehicle.plate_number || vehicle.model || "车辆"
      }`;

      const nextMaintenanceDate =
        vehicle.next_maintenance_date ||
        (vehicle.last_maintenance_date
          ? addMonths(vehicle.last_maintenance_date, 3)
          : null);

      if (nextMaintenanceDate) {
        const left = daysLeft(nextMaintenanceDate);

        if (left <= 15) {
          reminders.push({
            id: `vehicle-maintenance-${vehicle.id}`,
            title: vehicleTitle,
            description:
              left < 0
                ? `保养已超过 ${Math.abs(left)} 天`
                : `保养还有 ${left} 天需要处理`,
            daysLeft: left,
            category: "保养",
            tone: getTone(left),
          });
        }
      }

      if (vehicle.inspection_expiry_date) {
        const left = daysLeft(vehicle.inspection_expiry_date);

        if (left <= 30) {
          reminders.push({
            id: `vehicle-inspection-${vehicle.id}`,
            title: vehicleTitle,
            description:
              left < 0
                ? `车检已过期 ${Math.abs(left)} 天`
                : `车检还有 ${left} 天到期`,
            daysLeft: left,
            category: "车检",
            tone: getTone(left),
          });
        }
      }

      if (vehicle.insurance_expiry_date) {
        const left = daysLeft(vehicle.insurance_expiry_date);

        if (left <= 30) {
          reminders.push({
            id: `vehicle-insurance-${vehicle.id}`,
            title: vehicleTitle,
            description:
              left < 0
                ? `保险已过期 ${Math.abs(left)} 天`
                : `保险还有 ${left} 天到期`,
            daysLeft: left,
            category: "保险",
            tone: getTone(left),
          });
        }
      }
    }

    reminders.sort((a, b) => a.daysLeft - b.daysLeft);

    setDashboardReminders(reminders.slice(0, 6));
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
      loadCustomerCount(),
      loadRecentTrips(),
      loadDashboardReminders(),
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
      window.localStorage.setItem(
        "nichishin_login",
        JSON.stringify({
          role: "admin",
          username: "admin",
        })
      );
      return;
    }

    if (username === "D001" && password === "123456") {
      setRole("driver");
      setLoggedIn(true);
      setView("home");
      setLoginError("");
      window.localStorage.setItem(
        "nichishin_login",
        JSON.stringify({
          role: "driver",
          username: "D001",
        })
      );
      return;
    }

    setLoginError("用户名或密码错误");
  }

  function logout() {
    window.localStorage.removeItem("nichishin_login");
    setLoggedIn(false);
    setUsername("");
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
      <div className={role === "admin" ? "mx-auto max-w-6xl" : "mx-auto max-w-md"}>
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
              <AdminDashboard
                drivers={drivers}
                vehicles={vehicles}
                tripCount={tripCount}
                parkingCount={parkingCount}
                cashCount={cashCount}
                reminderCount={reminderCount}
                customerCount={customerCount}
                recentTrips={recentTrips}
                dashboardReminders={dashboardReminders}
              />
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
                  onClick={() => (window.location.href = "/vehicles")}
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


function AdminDashboard({
  drivers,
  vehicles,
  tripCount,
  parkingCount,
  cashCount,
  reminderCount,
  customerCount,
  recentTrips,
  dashboardReminders,
}: {
  drivers: Driver[];
  vehicles: Vehicle[];
  tripCount: number;
  parkingCount: number;
  cashCount: number;
  reminderCount: number;
  customerCount: number;
  recentTrips: DashboardTrip[];
  dashboardReminders: DashboardReminder[];
}) {
  const todayText = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).format(new Date());

  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  const tomorrowKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(tomorrowDate);

  const recentTripSections = [
    {
      key: "today",
      title: "今天行程",
      trips: recentTrips.filter((trip) => trip.trip_date === todayKey),
    },
    {
      key: "tomorrow",
      title: "明天行程",
      trips: recentTrips.filter((trip) => trip.trip_date === tomorrowKey),
    },
    {
      key: "future",
      title: "未来行程",
      trips: recentTrips.filter(
        (trip) =>
          Boolean(trip.trip_date) &&
          trip.trip_date !== todayKey &&
          trip.trip_date !== tomorrowKey
      ),
    },
  ];

  const menuItems = [
    { title: "仪表盘", href: "/" },
    { title: "司机管理", href: "/drivers" },
    { title: "车辆管理", href: "/vehicles" },
    { title: "行程管理", href: "/trips" },
    { title: "停车记录", href: "/admin-parking" },
    { title: "费用审核", href: "/admin-cash" },
    { title: "提醒管理", href: "/reminders" },
    { title: "客户管理", href: "/customers" },
  ];

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
      <aside className="hidden rounded-3xl bg-white p-5 shadow lg:block">
        <div>
          <p className="text-2xl font-extrabold text-emerald-700">
            日辰系统
          </p>
          <p className="mt-1 text-sm font-bold text-gray-400">
            管理后台
          </p>
        </div>

        <div className="mt-6 space-y-2">
          {menuItems.map((item, index) => (
            <button
              key={item.title}
              type="button"
              onClick={() => loadDashboardPage(item.href)}
              className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-extrabold ${
                index === 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.title}
            </button>
          ))}
        </div>
      </aside>

      <div className="space-y-5">
        <section className="rounded-3xl bg-white p-5 shadow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-600">
                欢迎回来，管理员
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-gray-900">
                运营管理总览
              </h2>
              <p className="mt-1 text-sm font-medium text-gray-500">
                {todayText}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-extrabold text-gray-700"
              >
                刷新
              </button>

              <button
                type="button"
                onClick={() => loadDashboardPage("/trips")}
                className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-white shadow-sm"
              >
                新建 / 查看行程
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <DashboardStat
            title="司机总数"
            value={`${drivers.length}`}
            unit="人"
            note="正常"
            tone="emerald"
            onClick={() => loadDashboardPage("/drivers")}
          />

          <DashboardStat
            title="车辆总数"
            value={`${vehicles.length}`}
            unit="台"
            note="车辆资料"
            tone="blue"
            onClick={() => loadDashboardPage("/vehicles")}
          />

          <DashboardStat
            title="行程订单"
            value={`${tripCount}`}
            unit="个"
            note="全部订单"
            tone="amber"
            onClick={() => loadDashboardPage("/trips")}
          />

          <DashboardStat
            title="停车记录"
            value={`${parkingCount}`}
            unit="条"
            note="GPS记录"
            tone="teal"
            onClick={() => loadDashboardPage("/admin-parking")}
          />

          <DashboardStat
            title="待处理提醒"
            value={`${reminderCount}`}
            unit="条"
            note="需要处理"
            tone="rose"
            onClick={() => loadDashboardPage("/reminders")}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr]">
          <div className="rounded-3xl bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">
                  近期行程管理
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  按今天、明天、未来分组查看近期派单
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadDashboardPage("/trips")}
                className="rounded-xl bg-gray-50 px-4 py-2 text-sm font-bold text-gray-600"
              >
                查看全部
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {recentTripSections.map((section) => (
                <div key={section.key}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-extrabold text-gray-900">
                      {section.title}
                    </p>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-extrabold text-gray-500">
                      {section.trips.length} 单
                    </span>
                  </div>

                  {section.trips.length === 0 ? (
                    <div className="mt-2 rounded-2xl bg-gray-50 p-4 text-sm font-medium text-gray-400">
                      暂无{section.title}
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {section.trips.map((trip) => (
                        <button
                          key={trip.id}
                          type="button"
                          onClick={() => loadDashboardPage("/trips")}
                          className="w-full rounded-2xl bg-gray-50 px-4 py-4 text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-extrabold text-gray-900">
                                {trip.trip_date || "未填写日期"} · {formatAdminTripTime(trip.start_time)}
                              </p>

                              <p className="mt-2 text-sm font-bold text-gray-700">
                                {trip.pickup_location || "未填写出发地"}
                                <span className="mx-2 text-gray-300">→</span>
                                {trip.destination || "未填写目的地"}
                              </p>

                              <p className="mt-2 text-xs font-medium text-gray-400">
                                订单编号：{trip.trip_number || "未填写"}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-xs font-extrabold ${adminTripStatusClass(trip.status)}`}
                            >
                              {adminTripStatusText(trip.status)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">
                  待处理提醒
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  驾照、体检、车检、保险、保养
                </p>
              </div>

              <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-extrabold text-rose-600">
                {reminderCount} 条
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {dashboardReminders.length === 0 ? (
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="font-extrabold text-emerald-700">
                    目前没有紧急提醒
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-600">
                    司机驾照、体检、车辆车检、保险和保养目前没有需要马上处理的事项。
                  </p>
                </div>
              ) : (
                dashboardReminders.map((reminder) => {
                  const reminderClass =
                    reminder.tone === "rose"
                      ? "bg-rose-50 text-rose-700"
                      : reminder.tone === "amber"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700";

                  return (
                    <button
                      key={reminder.id}
                      type="button"
                      onClick={() => loadDashboardPage("/reminders")}
                      className={`w-full rounded-2xl px-4 py-3 text-left ${reminderClass}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-extrabold">
                            {reminder.title}
                          </p>
                          <p className="mt-1 text-sm font-bold opacity-80">
                            {reminder.description}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold">
                          {reminder.category}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}

              <button
                type="button"
                onClick={() => loadDashboardPage("/reminders")}
                className="w-full rounded-2xl bg-rose-500 py-3 font-extrabold text-white shadow-sm"
              >
                查看提醒详情
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-3xl bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-gray-900">
                司机预览
              </h3>
              <button
                type="button"
                onClick={() => loadDashboardPage("/drivers")}
                className="text-sm font-bold text-emerald-600"
              >
                管理司机
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {drivers.slice(0, 4).map((driver) => (
                <div
                  key={driver.id}
                  className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3"
                >
                  <div>
                    <p className="font-extrabold text-gray-900">
                      {driver.driver_code} · {driver.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      电话：{driver.phone || "未填写"}
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                    {driver.status === "active" ? "在职" : driver.status}
                  </span>
                </div>
              ))}

              {drivers.length === 0 && (
                <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
                  暂无司机资料
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-gray-900">
                车辆预览
              </h3>
              <button
                type="button"
                onClick={() => loadDashboardPage("/vehicles")}
                className="text-sm font-bold text-emerald-600"
              >
                管理车辆
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {vehicles.slice(0, 4).map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3"
                >
                  <div>
                    <p className="font-extrabold text-gray-900">
                      {vehicle.vehicle_code} · {vehicle.model}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      车牌：{vehicle.plate_number || "未填写"}
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                    {vehicle.status}
                  </span>
                </div>
              ))}

              {vehicles.length === 0 && (
                <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
                  暂无车辆资料
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow">
          <h3 className="text-lg font-extrabold text-gray-900">
            快速操作
          </h3>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <QuickAction title="新建行程" href="/trips" />
            <QuickAction title="添加司机" href="/drivers" />
            <QuickAction title="添加车辆" href="/vehicles" />
            <QuickAction title="停车记录" href="/admin-parking" />
            <QuickAction title="费用审核" href="/admin-cash" />
            <QuickAction title="客户管理" href="/customers" />
            <QuickAction title="提醒管理" href="/reminders" />
            <QuickAction title="刷新数据" onClick={() => window.location.reload()} />
          </div>
        </section>
      </div>
    </div>
  );
}

function loadDashboardPage(path: string) {
  window.location.href = path;
}

function adminTripStatusText(status?: string | null) {
  const map: Record<string, string> = {
    scheduled: "待执行",
    in_progress: "进行中",
    completed: "已完成",
    cancelled: "已取消",
  };

  return map[status || ""] || "未知";
}

function adminTripStatusClass(status?: string | null) {
  if (status === "in_progress") {
    return "bg-orange-50 text-orange-700";
  }

  if (status === "completed") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "cancelled") {
    return "bg-gray-100 text-gray-600";
  }

  return "bg-blue-50 text-blue-700";
}

function formatAdminTripTime(value?: string | null) {
  if (!value) return "--:--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 5);
  }

  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function DashboardStat({
  title,
  value,
  unit,
  note,
  tone,
  onClick,
}: {
  title: string;
  value: string;
  unit: string;
  note: string;
  tone: "emerald" | "blue" | "amber" | "teal" | "rose";
  onClick: () => void;
}) {
  const colorClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "blue"
        ? "bg-blue-50 text-blue-700"
        : tone === "amber"
          ? "bg-amber-50 text-amber-700"
          : tone === "teal"
            ? "bg-teal-50 text-teal-700"
            : "bg-rose-50 text-rose-700";

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-3xl bg-white p-5 text-left shadow transition active:scale-95"
    >
      <div className={`inline-flex rounded-2xl px-3 py-2 text-sm font-bold ${colorClass}`}>
        {title}
      </div>

      <p className="mt-4 text-3xl font-extrabold text-gray-900">
        {value}
        <span className="ml-1 text-base font-bold text-gray-400">
          {unit}
        </span>
      </p>

      <p className="mt-2 text-sm font-medium text-gray-500">
        {note}
      </p>
    </button>
  );
}

function DashboardRow({
  title,
  description,
  value,
  onClick,
}: {
  title: string;
  description: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl bg-gray-50 px-4 py-4 text-left"
    >
      <div>
        <p className="font-extrabold text-gray-900">{title}</p>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>

      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-extrabold text-gray-700 shadow-sm">
        {value}
      </span>
    </button>
  );
}

function QuickAction({
  title,
  href,
  onClick,
}: {
  title: string;
  href?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (onClick) {
          onClick();
          return;
        }

        if (href) {
          window.location.href = href;
        }
      }}
      className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-extrabold text-gray-700 active:scale-95"
    >
      {title}
    </button>
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
