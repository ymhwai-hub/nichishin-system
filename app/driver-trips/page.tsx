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
  end_time: string | null;
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
  const [statusFilter, setStatusFilter] = useState("scheduled");
  const [dateFilter, setDateFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
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
          end_time,
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

  function getTripOverlapWarning(currentTrip: Trip) {
    if (
      currentTrip.status === "cancelled" ||
      currentTrip.status === "completed" ||
      !currentTrip.start_time
    ) {
      return "";
    }

    const currentIsAirportTransfer =
      currentTrip.trip_type === "airport_pickup" ||
      currentTrip.trip_type === "airport_dropoff";

    if (!currentIsAirportTransfer) {
      return "";
    }

    const currentStart = new Date(currentTrip.start_time).getTime();
    const currentEnd = currentTrip.end_time
      ? new Date(currentTrip.end_time).getTime()
      : currentStart + 2 * 60 * 60 * 1000;

    const conflictTrips = trips.filter((trip) => {
      if (
        trip.id === currentTrip.id ||
        trip.status === "cancelled" ||
        trip.status === "completed" ||
        !trip.start_time
      ) {
        return false;
      }

      const isAirportTransfer =
        trip.trip_type === "airport_pickup" ||
        trip.trip_type === "airport_dropoff";

      if (!isAirportTransfer) {
        return false;
      }

      const tripStart = new Date(trip.start_time).getTime();
      const tripEnd = trip.end_time
        ? new Date(trip.end_time).getTime()
        : tripStart + 2 * 60 * 60 * 1000;

      return tripStart < currentEnd && tripEnd > currentStart;
    });

    if (conflictTrips.length === 0) {
      return "";
    }

    const conflictNumbers = conflictTrips
      .map((trip) => trip.trip_number)
      .filter(Boolean)
      .join("、");

    return `这条行程与订单 ${conflictNumbers} 时间重叠，请和办公室发单人员确认实际调度。`;
  }


  function getJapanDateText(offsetDays = 0) {
    const now = new Date();
    now.setDate(now.getDate() + offsetDays);

    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  }

  const dateOptions = Array.from(
    new Set(trips.map((trip) => trip.trip_date).filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));

  const driverSectionStatusOrder: Record<string, number> = {
    scheduled: 1,
    in_progress: 2,
    completed: 3,
    cancelled: 4,
  };

  const filteredTrips = trips.filter((trip) => {
    const matchesStatus =
      statusFilter === "all" || trip.status === statusFilter;

    const matchesDate =
      dateFilter === "" || trip.trip_date === dateFilter;

    const keyword = searchTerm.trim().toLowerCase();

    const searchText = [
      trip.trip_number,
      trip.flight_number,
      trip.pickup_location,
      trip.destination,
      trip.customer_name,
      trip.vehicles?.vehicle_code,
      trip.vehicles?.model,
      trip.vehicles?.plate_number,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      keyword === "" || searchText.includes(keyword);

    return matchesStatus && matchesDate && matchesSearch;
  }).sort((a, b) => {
    const statusDiff =
      (driverSectionStatusOrder[a.status] ?? 99) -
      (driverSectionStatusOrder[b.status] ?? 99);

    if (statusDiff !== 0) {
      return statusDiff;
    }

    const aTime = new Date(
      a.start_time || `${a.trip_date}T00:00:00+09:00`
    ).getTime();

    const bTime = new Date(
      b.start_time || `${b.trip_date}T00:00:00+09:00`
    ).getTime();

    return aTime - bTime;
  });

  

  

  const driverStatusSections = [
    { key: "scheduled", title: "待执行", safe: "注" },
    { key: "in_progress", title: "进行中", safe: "意" },
    { key: "completed", title: "已完成", safe: "安" },
    { key: "cancelled", title: "已取消", safe: "全" },
  ];

  const driverStatusCounts = Object.fromEntries(
    driverStatusSections.map((section) => [
      section.key,
      trips.filter((trip) => trip.status === section.key).length,
    ])
  ) as Record<string, number>;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-white px-4 py-4 sm:px-5">
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold tracking-[0.25em] text-emerald-600">
                DRIVER APP
              </p>

              <h1 className="mt-2 text-2xl font-extrabold text-gray-900">
                我的行程
              </h1>

              <p className="mt-1 text-sm font-bold text-gray-500">
                查看今日订单、开始行程、完成行程和确认订单详情。
              </p>
            </div>

            <a
              href="/"
              className="shrink-0 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition active:scale-95"
            >
              返回
            </a>
          </div>
        </section>

        {driver && (
          <section className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-500 p-5 text-white shadow-sm">
            <p className="text-sm opacity-80">当前司机</p>
            <p className="mt-2 text-xl font-bold">
              {driver.driver_code} · {driver.name}
            </p>
          </section>
        )}

        {message && (
          <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-extrabold text-red-700 shadow-sm">
            {message}
          </div>
        )}

        {/* 司机端状态筛选 */}
        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-gray-800">
              搜索行程
            </span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索订单编号、航班号、地点、客户或车牌"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
            />
          </label>

<div>
  <div className="mb-2 flex items-center justify-between">
    <p className="text-sm font-bold text-gray-800">
      行程状态
    </p>
    <p className="text-xs font-bold text-gray-400">
      点击切换
    </p>
  </div>

  <div className="grid grid-cols-4 gap-2">
    {driverStatusSections.map((section) => {
      const active = statusFilter === section.key;
      const count = driverStatusCounts[section.key] ?? 0;

      const colorClass =
        section.key === "scheduled"
          ? active
            ? "border-blue-400 bg-blue-100 text-blue-900"
            : "border-blue-100 bg-blue-50 text-blue-800"
          : section.key === "in_progress"
            ? active
              ? "border-orange-400 bg-orange-100 text-orange-900"
              : "border-orange-100 bg-orange-50 text-orange-800"
            : section.key === "completed"
              ? active
                ? "border-emerald-400 bg-emerald-100 text-emerald-900"
                : "border-emerald-100 bg-emerald-50 text-emerald-800"
              : active
                ? "border-gray-400 bg-gray-100 text-gray-900"
                : "border-gray-200 bg-gray-50 text-gray-700";

      return (
        <button
          key={section.key}
          type="button"
          onClick={() => setStatusFilter(section.key)}
          className={`rounded-2xl border px-2 py-3 text-center shadow-sm ${colorClass}`}
        >
          <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-extrabold shadow-sm">
            {section.safe}
          </div>

          <p className="text-sm font-extrabold">
            {section.title}
          </p>

          <p className="mt-1 text-xs font-bold opacity-70">
            {count} 单
          </p>
        </button>
      );
    })}
  </div>
</div>

<label className="mt-3 block">
    <span className="mb-2 block text-sm font-bold text-gray-800">
      日历选择日期
    </span>
    <input
      type="date"
      value={dateFilter}
      onChange={(event) => setDateFilter(event.target.value)}
      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
    />
  </label>

  {(statusFilter !== "scheduled" || dateFilter) && (
    <button
      type="button"
      onClick={() => {
        setStatusFilter("scheduled");
        setDateFilter("");
        setSearchTerm("");
      }}
      className="mt-3 w-full rounded-2xl bg-gray-100 px-4 py-3 font-extrabold text-gray-700 transition active:scale-95"
    >
      清除筛选
    </button>
  )}



  

          <p className="mt-3 text-sm font-bold text-gray-500">
            当前显示：{filteredTrips.length} 条，共 {trips.length} 条
          </p>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-gray-100 bg-white p-5 text-sm font-bold text-gray-500 shadow-sm">
            正在读取行程……
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 bg-white p-5 text-sm font-bold text-gray-500 shadow-sm">
            暂时没有分配给你的行程
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrips.map((trip) => {
              const statusBadgeClass =
                trip.status === "scheduled"
                  ? "border-blue-100 bg-blue-50 text-blue-700"
                  : trip.status === "in_progress"
                    ? "border-orange-100 bg-orange-50 text-orange-700"
                    : trip.status === "completed"
                      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-gray-100 text-gray-600";

              return (
                <div
                  key={trip.id}
                  className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-sm"
                >
                  <div className="bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 p-5 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold tracking-[0.18em] text-emerald-50">
                          {trip.trip_number}
                        </p>

                        <p className="mt-2 text-3xl font-extrabold tracking-tight">
                          {formatTime(trip.start_time)}
                        </p>

                        <p className="mt-1 text-sm font-bold text-emerald-50">
                          {trip.trip_date}
                          {trip.end_time
                            ? ` · 结束 ${formatTime(trip.end_time)}`
                            : ""}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border bg-white px-3 py-1 text-xs font-extrabold shadow-sm ${statusBadgeClass}`}
                      >
                        {statusText(trip.status)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-extrabold">
                        {tripTypeText(trip.trip_type)}
                      </span>

                      <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-extrabold">
                        {trip.passenger_count}人 · {trip.luggage_count}件
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-extrabold text-emerald-700">
                          起
                        </span>

                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-gray-400">
                            出发地
                          </p>
                          <p className="mt-1 break-words text-lg font-extrabold leading-7 text-gray-900">
                            {trip.pickup_location || "未填写出发地点"}
                          </p>
                        </div>
                      </div>

                      <div className="ml-4 my-3 h-8 border-l-2 border-dashed border-gray-200" />

                      <div className="flex gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-sm font-extrabold text-blue-700">
                          到
                        </span>

                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-gray-400">
                            目的地
                          </p>
                          <p className="mt-1 break-words text-lg font-extrabold leading-7 text-gray-900">
                            {trip.destination || "未填写目的地"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <p className="text-xs font-extrabold text-gray-400">航班号</p>
                        <p className="mt-1 truncate font-extrabold text-gray-800">
                          {trip.flight_number || "未填写"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <p className="text-xs font-extrabold text-gray-400">车牌</p>
                        <p className="mt-1 truncate font-extrabold text-gray-800">
                          {trip.vehicles?.plate_number || "未填写"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <p className="text-xs font-extrabold text-gray-400">车辆</p>
                        <p className="mt-1 truncate font-extrabold text-gray-800">
                          {trip.vehicles
                            ? `${trip.vehicles.vehicle_code} · ${trip.vehicles.model}`
                            : "未分配"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <p className="text-xs font-extrabold text-gray-400">客户</p>
                        <p className="mt-1 truncate font-extrabold text-gray-800">
                          {trip.customer_name ?? "未关联客户"}
                        </p>
                      </div>
                    </div>

                    {getTripOverlapWarning(trip) && (
                      <div className="mt-4 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                        <p>⚠️ 时间重叠提醒</p>
                        <p className="mt-1 leading-6">
                          {getTripOverlapWarning(trip)}
                        </p>
                      </div>
                    )}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = `/driver-trips/${trip.id}`;
                        }}
                        className="rounded-2xl border border-emerald-200 bg-emerald-50 py-4 font-extrabold text-emerald-700 transition active:scale-95"
                      >
                        查看详情
                      </button>

                      {trip.status === "scheduled" && (
                        <button
                          type="button"
                          onClick={() =>
                            updateTripStatus(trip.id, "in_progress")
                          }
                          disabled={updatingTripId === trip.id}
                          className="rounded-2xl bg-emerald-600 py-4 font-extrabold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
                        >
                          {updatingTripId === trip.id
                            ? "正在更新……"
                            : "开始行程"}
                        </button>
                      )}

                      {trip.status === "in_progress" && (
                        <button
                          type="button"
                          onClick={() =>
                            updateTripStatus(trip.id, "completed")
                          }
                          disabled={updatingTripId === trip.id}
                          className="rounded-2xl bg-blue-600 py-4 font-extrabold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
                        >
                          {updatingTripId === trip.id
                            ? "正在更新……"
                            : "完成行程"}
                        </button>
                      )}

                      {trip.status === "completed" && (
                        <div className="rounded-2xl bg-emerald-50 py-4 text-center font-extrabold text-emerald-700 sm:col-span-2">
                          此行程已完成
                        </div>
                      )}

                      {trip.status === "cancelled" && (
                        <div className="rounded-2xl bg-gray-100 py-4 text-center font-extrabold text-gray-500 sm:col-span-2">
                          此行程已取消
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
