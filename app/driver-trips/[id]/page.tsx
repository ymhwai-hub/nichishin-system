"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Trip = {
  id: string;
  trip_number?: string;
  trip_date?: string;
  start_time?: string;
  end_time?: string | null;
  trip_type?: string;
  status?: string;
  flight_number?: string | null;
  pickup_location?: string | null;
  destination?: string | null;
  passenger_count?: number | null;
  luggage_count?: number | null;
  vehicle_id?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  notes?: string | null;
};

type InfoRecord = Record<string, unknown>;

function text(value: unknown, fallback = "未填写") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function formatTime(value?: string | null) {
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

function statusText(status?: string) {
  const map: Record<string, string> = {
    scheduled: "待执行",
    in_progress: "进行中",
    completed: "已完成",
    cancelled: "已取消",
  };

  return map[status || ""] || "未知状态";
}

function tripTypeText(type?: string) {
  const map: Record<string, string> = {
    airport_pickup: "机场接机",
    airport_dropoff: "机场送机",
    charter: "一日包车",
    transfer: "点对点接送",
  };

  return map[type || ""] || text(type, "未填写类型");
}

export default function DriverTripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = String(params.id || "");

  const [trip, setTrip] = useState<Trip | null>(null);
  const [vehicle, setVehicle] = useState<InfoRecord | null>(null);
  const [customer, setCustomer] = useState<InfoRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");

  async function loadTrip() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (error || !data) {
      setMessage("读取订单失败，请返回列表重新打开");
      setLoading(false);
      return;
    }

    const tripData = data as Trip;
    setTrip(tripData);

    if (tripData.vehicle_id) {
      const { data: vehicleData } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", tripData.vehicle_id)
        .single();

      setVehicle((vehicleData || null) as InfoRecord | null);
    } else {
      setVehicle(null);
    }

    if (tripData.customer_id) {
      const { data: customerData } = await supabase
        .from("customers")
        .select("*")
        .eq("id", tripData.customer_id)
        .single();

      setCustomer((customerData || null) as InfoRecord | null);
    } else {
      setCustomer(null);
    }

    setLoading(false);
  }

  async function updateTripStatus(nextStatus: string) {
    if (!trip) return;

    setUpdating(true);
    setMessage("");

    const { error } = await supabase
      .from("trips")
      .update({ status: nextStatus })
      .eq("id", trip.id);

    if (error) {
      setMessage("更新失败，请稍后再试");
      setUpdating(false);
      return;
    }

    setMessage("状态已更新");
    await loadTrip();
    setUpdating(false);
  }

  useEffect(() => {
    if (tripId) {
      loadTrip();
    }
  }, [tripId]);

  const customerName = text(
    customer?.["customer_name"] ||
      customer?.["name"] ||
      trip?.customer_name,
    "未关联客户"
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white px-4 py-6">
      <div className="mx-auto max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-emerald-600">司机端</p>
            <h1 className="text-2xl font-extrabold text-gray-900">
              订单详情
            </h1>
          </div>

          <button
            type="button"
            onClick={() => router.push("/driver-trips")}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-gray-600 shadow-sm"
          >
            返回
          </button>
        </div>

        {message && (
          <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            正在读取订单……
          </div>
        ) : !trip ? (
          <div className="rounded-3xl bg-white p-5 text-gray-500 shadow-sm">
            没有找到订单
          </div>
        ) : (
          <div className="space-y-4">
            <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white">
                <p className="text-sm font-bold text-emerald-50">
                  订单编号
                </p>
                <p className="mt-1 text-2xl font-extrabold">
                  {text(trip.trip_number)}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold">
                    {tripTypeText(trip.trip_type)}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-emerald-700">
                    {statusText(trip.status)}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-bold text-gray-400">
                    日期时间
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-gray-900">
                    {text(trip.trip_date)} · {formatTime(trip.start_time)}
                    {trip.end_time ? `—${formatTime(trip.end_time)}` : ""}
                  </p>
                </div>

                <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-bold text-gray-400">出发地</p>
                  <p className="mt-1 font-extrabold text-gray-900">
                    {text(trip.pickup_location, "未填写出发地点")}
                  </p>

                  <div className="my-4 flex items-center gap-3 text-gray-300">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="font-bold">→</span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>

                  <p className="text-xs font-bold text-gray-400">目的地</p>
                  <p className="mt-1 font-extrabold text-gray-900">
                    {text(trip.destination, "未填写目的地")}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-extrabold text-gray-900">
                行程信息
              </h2>

              <div className="mt-4 space-y-3 text-sm">
                <InfoRow label="航班号" value={text(trip.flight_number)} />
                <InfoRow
                  label="乘客 / 行李"
                  value={`${trip.passenger_count ?? 0}人 · ${
                    trip.luggage_count ?? 0
                  }件`}
                />
                <InfoRow label="备注" value={text(trip.notes)} />
              </div>
            </section>

            <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-extrabold text-gray-900">
                车辆信息
              </h2>

              <div className="mt-4 space-y-3 text-sm">
                <InfoRow
                  label="车辆"
                  value={
                    vehicle
                      ? `${text(vehicle["vehicle_code"])} · ${text(
                          vehicle["model"]
                        )}`
                      : "未分配"
                  }
                />
                <InfoRow label="车牌" value={text(vehicle?.["plate_number"])} />
                <InfoRow label="颜色" value={text(vehicle?.["color"])} />
              </div>
            </section>

            <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-extrabold text-gray-900">
                客户信息
              </h2>

              <div className="mt-4 space-y-3 text-sm">
                <InfoRow label="客户" value={customerName} />
                <InfoRow label="电话" value={text(customer?.["phone"])} />
                <InfoRow
                  label="LINE"
                  value={text(customer?.["line"] || customer?.["line_id"])}
                />
                <InfoRow label="备注" value={text(customer?.["notes"])} />
              </div>
            </section>

            {trip.status === "scheduled" && (
              <button
                type="button"
                onClick={() => updateTripStatus("in_progress")}
                disabled={updating}
                className="w-full rounded-2xl bg-emerald-500 py-4 font-extrabold text-white shadow-sm disabled:opacity-50"
              >
                {updating ? "正在更新……" : "开始行程"}
              </button>
            )}

            {trip.status === "in_progress" && (
              <button
                type="button"
                onClick={() => updateTripStatus("completed")}
                disabled={updating}
                className="w-full rounded-2xl bg-blue-500 py-4 font-extrabold text-white shadow-sm disabled:opacity-50"
              >
                {updating ? "正在更新……" : "完成行程"}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3">
      <span className="shrink-0 font-bold text-gray-400">{label}</span>
      <span className="text-right font-extrabold text-gray-800">{value}</span>
    </div>
  );
}
