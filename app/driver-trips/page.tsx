"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Driver = {
  id: string;
  driver_code: string;
  name: string;
};

type Trip = {
  id: string;
  trip_number: string;
  customer_id: string | null;
  customer_name?: string | null;
  trip_type: string;
  trip_date: string;
  start_time: string | null;
  pickup_location: string | null;
  destination: string | null;
  flight_number: string | null;
  passenger_count: number;
  luggage_count: number;
  status: string;
  vehicles:
    | {
        vehicle_code: string;
        model: string;
        plate_number: string;
      }
    | null;
};

export default function DriverTripsPage() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [updatingTripId, setUpdatingTripId] = useState<string | null>(null);

  useEffect(() => {
    async function loadDriverTrips() {
      setLoading(true);
      setMessage("");

      // 当前测试司机账号为 D001
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("id, driver_code, name")
        .eq("driver_code", "D001")
        .single();

      if (driverError || !driverData) {
        setMessage(`读取司机资料失败：${driverError?.message || "找不到司机"}`);
        setLoading(false);
        return;
      }

      setDriver(driverData);

      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .select(`
          id,
          trip_number,
          customer_id,
          trip_type,
          trip_date,
          start_time,
          pickup_location,
          destination,
          flight_number,
          passenger_count,
          luggage_count,
          status,
          vehicles (
            vehicle_code,
            model,
            plate_number
          )
        `)
        .eq("driver_id", driverData.id)
        .order("trip_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (tripError) {
        setMessage(`读取行程失败：${tripError.message}`);
        setLoading(false);
        return;
      }

      const rows = (tripData ?? []) as any[];

      const customerIds = [
        ...new Set(
          rows
            .map((row) => row.customer_id)
            .filter(Boolean)
        ),
      ];

      let customerMap: Record<string, string> = {};

      if (customerIds.length > 0) {
        const { data: customerData, error: customerError } =
          await supabase
            .from("customers")
            .select("id, customer_name")
            .in("id", customerIds);

        if (customerError) {
          setMessage(`读取客户姓名失败：${customerError.message}`);
          setLoading(false);
          return;
        }

        customerMap = Object.fromEntries(
          (customerData ?? []).map((customer) => [
            customer.id,
            customer.customer_name,
          ])
        );
      }

      setTrips(
        rows.map((row) => ({
          ...row,
          customer_name: row.customer_id
            ? customerMap[row.customer_id] ?? "客户资料不存在"
            : null,
        })) as Trip[]
      );
      setLoading(false);
    }

    loadDriverTrips();
  }, []);

  async function updateTripStatus(
    tripId: string,
    status: "in_progress" | "completed"
  ) {
    setUpdatingTripId(tripId);
    setMessage("");

    const { error } = await supabase
      .from("trips")
      .update({ status })
      .eq("id", tripId);

    if (error) {
      setMessage(`更新行程状态失败：${error.message}`);
      setUpdatingTripId(null);
      return;
    }

    setTrips((currentTrips) =>
      currentTrips.map((trip) =>
        trip.id === tripId ? { ...trip, status } : trip
      )
    );

    setMessage(
      status === "in_progress"
        ? "行程已经开始，管理员端状态已同步"
        : "行程已经完成，管理员端状态已同步"
    );

    setUpdatingTripId(null);
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
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-600">司机端</p>
            <h1 className="text-2xl font-bold text-gray-900">
              我的行程
            </h1>
          </div>

          <a
            href="/"
            className="rounded-xl bg-white px-4 py-2 text-sm text-gray-700 shadow"
          >
            返回首页
          </a>
        </div>

        {driver && (
          <div className="mt-5 rounded-3xl bg-emerald-500 p-5 text-white shadow">
            <p className="text-sm opacity-80">当前司机</p>
            <p className="mt-2 text-xl font-bold">
              {driver.driver_code} · {driver.name}
            </p>
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-600">
            {message}
          </div>
        )}

        {loading ? (
          <div className="mt-5 rounded-2xl bg-white p-5 shadow">
            正在读取行程……
          </div>
        ) : trips.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-white p-5 text-gray-500 shadow">
            暂时没有分配给你的行程
          </div>
        ) : (
          <div className="mt-5 space-y-4">
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

                {trip.flight_number && (
                  <p className="mt-4 text-sm font-medium text-gray-700">
                    航班号：{trip.flight_number}
                  </p>
                )}

                <div className="mt-4 rounded-xl bg-gray-50 p-4">
                  <p className="font-medium text-gray-900">
                    {trip.pickup_location || "未填写出发地点"}
                  </p>

                  <p className="my-2 text-sm text-gray-400">↓</p>

                  <p className="font-medium text-gray-900">
                    {trip.destination || "未填写目的地"}
                  </p>
                </div>

                <div className="mt-4 text-sm text-gray-500">
                  <p>
                    车辆：
                    {trip.vehicles
                      ? `${trip.vehicles.vehicle_code} · ${trip.vehicles.model}`
                      : "未分配"}
                  </p>

                  <p className="mt-1">
                    车牌：
                    {trip.vehicles?.plate_number || "未填写"}
                  </p>

                  <p className="mt-1">
                    客户：{trip.customer_name ?? "未关联客户"}
                  </p>

                  <p className="mt-1">
                    乘客：{trip.passenger_count}人 · 行李：
                    {trip.luggage_count}件
                  </p>

                  <p className="mt-2 text-xs text-gray-400">
                    订单编号：{trip.trip_number}
                  </p>
                </div>

                {trip.status === "scheduled" && (
                  <button
                    onClick={() =>
                      updateTripStatus(trip.id, "in_progress")
                    }
                    disabled={updatingTripId === trip.id}
                    className="mt-4 w-full rounded-xl bg-emerald-500 py-3 font-bold text-white disabled:opacity-50"
                  >
                    {updatingTripId === trip.id
                      ? "正在更新……"
                      : "开始行程"}
                  </button>
                )}

                {trip.status === "in_progress" && (
                  <button
                    onClick={() =>
                      updateTripStatus(trip.id, "completed")
                    }
                    disabled={updatingTripId === trip.id}
                    className="mt-4 w-full rounded-xl bg-blue-500 py-3 font-bold text-white disabled:opacity-50"
                  >
                    {updatingTripId === trip.id
                      ? "正在更新……"
                      : "完成行程"}
                  </button>
                )}

                {trip.status === "completed" && (
                  <div className="mt-4 rounded-xl bg-gray-100 py-3 text-center font-semibold text-gray-600">
                    此行程已完成
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
