"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Driver = {
  id: string;
  driver_code: string;
  name: string;
};

type Vehicle = {
  id: string;
  vehicle_code: string;
  plate_number: string;
  model: string;
};

type Trip = {
  id: string;
  trip_number: string;
  trip_type: string;
  trip_date: string;
  start_time: string | null;
  pickup_location: string | null;
  destination: string | null;
  passenger_count: number;
  luggage_count: number;
  status: string;
  drivers:
    | {
        driver_code: string;
        name: string;
      }
    | null;
  vehicles:
    | {
        vehicle_code: string;
        model: string;
      }
    | null;
};

export default function TripsPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  const [tripType, setTripType] = useState("airport_pickup");
  const [tripDate, setTripDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [passengerCount, setPassengerCount] = useState("1");
  const [luggageCount, setLuggageCount] = useState("0");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadDrivers() {
    const { data, error } = await supabase
      .from("drivers")
      .select("id, driver_code, name")
      .eq("status", "active")
      .order("driver_code");

    if (error) {
      setMessage(`读取司机失败：${error.message}`);
      return;
    }

    setDrivers(data ?? []);
  }

  async function loadVehicles() {
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, vehicle_code, plate_number, model")
      .eq("status", "active")
      .order("vehicle_code");

    if (error) {
      setMessage(`读取车辆失败：${error.message}`);
      return;
    }

    setVehicles(data ?? []);
  }

  async function loadTrips() {
    const { data, error } = await supabase
      .from("trips")
      .select(`
        id,
        trip_number,
        trip_type,
        trip_date,
        start_time,
        pickup_location,
        destination,
        passenger_count,
        luggage_count,
        status,
        drivers (
          driver_code,
          name
        ),
        vehicles (
          vehicle_code,
          model
        )
      `)
      .order("trip_date", { ascending: false })
      .order("start_time", { ascending: true });

    if (error) {
      setMessage(`读取行程失败：${error.message}`);
      return;
    }

    setTrips((data as Trip[]) ?? []);
  }

  useEffect(() => {
    async function initialize() {
      setLoading(true);

      await Promise.all([
        loadDrivers(),
        loadVehicles(),
        loadTrips(),
      ]);

      setLoading(false);
    }

    initialize();
  }, []);

  async function addTrip() {
    if (
      !tripDate ||
      !startTime ||
      !driverId ||
      !vehicleId ||
      !pickupLocation ||
      !destination
    ) {
      setMessage("请填写日期、时间、司机、车辆、出发地和目的地");
      return;
    }

    setSaving(true);
    setMessage("");

    const tripNumber = `R${Date.now()}`;
    const startDateTime = `${tripDate}T${startTime}:00+09:00`;

    const { error } = await supabase.from("trips").insert({
      trip_number: tripNumber,
      trip_type: tripType,
      trip_date: tripDate,
      start_time: startDateTime,
      driver_id: driverId,
      vehicle_id: vehicleId,
      pickup_location: pickupLocation,
      destination,
      flight_number: flightNumber || null,
      passenger_count: Number(passengerCount || 1),
      luggage_count: Number(luggageCount || 0),
      signature_required: tripType === "charter",
      status: "scheduled",
    });

    if (error) {
      setMessage(`保存失败：${error.message}`);
      setSaving(false);
      return;
    }

    setTripDate("");
    setStartTime("");
    setDriverId("");
    setVehicleId("");
    setPickupLocation("");
    setDestination("");
    setFlightNumber("");
    setPassengerCount("1");
    setLuggageCount("0");

    setMessage("行程已成功保存到数据库");
    setSaving(false);

    await loadTrips();
  }

  function tripTypeText(type: string) {
    if (type === "airport_pickup") return "机场接机";
    if (type === "airport_dropoff") return "机场送机";
    if (type === "charter") return "一日包车";
    return type;
  }

  function statusText(status: string) {
    if (status === "scheduled") return "待执行";
    if (status === "in_progress") return "进行中";
    if (status === "completed") return "已完成";
    if (status === "cancelled") return "已取消";
    return status;
  }

  function formatTime(value: string | null) {
    if (!value) return "未设置";

    return new Date(value).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Tokyo",
    });
  }

  return (
    <main className="min-h-screen bg-emerald-50 p-5">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-600">日辰株式会社</p>
            <h1 className="text-2xl font-bold text-gray-900">
              行程管理
            </h1>
          </div>

          <a
            href="/"
            className="rounded-xl bg-white px-4 py-2 text-sm text-gray-700 shadow"
          >
            返回首页
          </a>
        </div>

        <div className="mt-5 rounded-3xl bg-white p-6 shadow">
          <h2 className="text-lg font-bold text-gray-900">
            新增行程
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-600">
                行程类型
              </label>

              <select
                value={tripType}
                onChange={(event) => setTripType(event.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              >
                <option value="airport_pickup">机场接机</option>
                <option value="airport_dropoff">机场送机</option>
                <option value="charter">一日包车</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">
                行程日期
              </label>

              <input
                type="date"
                value={tripDate}
                onChange={(event) => setTripDate(event.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">
                出发时间
              </label>

              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">
                航班号
              </label>

              <input
                value={flightNumber}
                onChange={(event) =>
                  setFlightNumber(event.target.value.toUpperCase())
                }
                placeholder="例如 MM722"
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">
                分配司机
              </label>

              <select
                value={driverId}
                onChange={(event) => setDriverId(event.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              >
                <option value="">请选择司机</option>

                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.driver_code} · {driver.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">
                分配车辆
              </label>

              <select
                value={vehicleId}
                onChange={(event) => setVehicleId(event.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              >
                <option value="">请选择车辆</option>

                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicle_code} · {vehicle.model}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-gray-600">
                出发地点
              </label>

              <input
                value={pickupLocation}
                onChange={(event) =>
                  setPickupLocation(event.target.value)
                }
                placeholder="例如：中部国际机场 T1"
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-gray-600">
                目的地
              </label>

              <input
                value={destination}
                onChange={(event) =>
                  setDestination(event.target.value)
                }
                placeholder="例如：名古屋万豪酒店"
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">
                乘客人数
              </label>

              <input
                type="number"
                min="1"
                value={passengerCount}
                onChange={(event) =>
                  setPassengerCount(event.target.value)
                }
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">
                行李数量
              </label>

              <input
                type="number"
                min="0"
                value={luggageCount}
                onChange={(event) =>
                  setLuggageCount(event.target.value)
                }
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>
          </div>

          {message && (
            <p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
              {message}
            </p>
          )}

          <button
            onClick={addTrip}
            disabled={saving}
            className="mt-5 w-full rounded-xl bg-emerald-500 py-3 font-bold text-white disabled:opacity-50"
          >
            {saving ? "正在保存……" : "保存行程"}
          </button>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-bold text-gray-900">
            已保存行程
          </h2>

          {loading ? (
            <div className="mt-3 rounded-2xl bg-white p-5 shadow">
              正在读取行程……
            </div>
          ) : trips.length === 0 ? (
            <div className="mt-3 rounded-2xl bg-white p-5 text-gray-500 shadow">
              暂无行程
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="rounded-2xl bg-white p-5 shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">
                        {trip.trip_date} · {formatTime(trip.start_time)}
                      </p>

                      <p className="mt-1 text-sm text-emerald-600">
                        {tripTypeText(trip.trip_type)}
                      </p>
                    </div>

                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                      {statusText(trip.status)}
                    </span>
                  </div>

                  <p className="mt-4 font-medium text-gray-900">
                    {trip.pickup_location || "未填写"}
                  </p>

                  <p className="my-1 text-sm text-gray-400">↓</p>

                  <p className="font-medium text-gray-900">
                    {trip.destination || "未填写"}
                  </p>

                  <div className="mt-4 border-t pt-3 text-sm text-gray-500">
                    <p>
                      司机：
                      {trip.drivers
                        ? `${trip.drivers.driver_code} · ${trip.drivers.name}`
                        : "未分配"}
                    </p>

                    <p className="mt-1">
                      车辆：
                      {trip.vehicles
                        ? `${trip.vehicles.vehicle_code} · ${trip.vehicles.model}`
                        : "未分配"}
                    </p>

                    <p className="mt-1">
                      乘客：{trip.passenger_count}人 · 行李：
                      {trip.luggage_count}件
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      订单编号：{trip.trip_number}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
