"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type ParkingRecord = {
  id: string;
  event_type: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  mileage: number | null;
  recorded_at: string;
  drivers:
    | {
        driver_code: string;
        name: string;
      }
    | null;
  vehicles:
    | {
        vehicle_code: string;
        plate_number: string;
      }
    | null;
  trips:
    | {
        trip_number: string;
      }
    | null;
};

export default function AdminParkingPage() {
  const [records, setRecords] = useState<ParkingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadRecords() {
      setLoading(true);

      const { data, error } = await supabase
        .from("parking_records")
        .select(`
          id,
          event_type,
          location_name,
          latitude,
          longitude,
          mileage,
          recorded_at,
          drivers (
            driver_code,
            name
          ),
          vehicles (
            vehicle_code,
            plate_number
          ),
          trips (
            trip_number
          )
        `)
        .order("recorded_at", { ascending: false });

      if (error) {
        setMessage(`读取停车记录失败：${error.message}`);
        setLoading(false);
        return;
      }

      setRecords((data as ParkingRecord[]) ?? []);
      setLoading(false);
    }

    loadRecords();
  }, []);

  function eventTypeText(type: string) {
    if (type === "arrival") return "到达";
    if (type === "departure") return "离开";
    return "停车";
  }

  function formatDateTime(value: string) {
    return new Date(value).toLocaleString("zh-CN", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return (
    <main className="min-h-screen bg-emerald-50 p-5">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              管理员端
            </p>
            <h1 className="text-2xl font-bold text-gray-900">
              停车记录
            </h1>
          </div>

          <a
            href="/"
            className="rounded-xl bg-white px-4 py-2 font-medium text-gray-800 shadow"
          >
            返回首页
          </a>
        </div>

        {message && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-red-700">
            {message}
          </div>
        )}

        {loading ? (
          <div className="mt-5 rounded-2xl bg-white p-5 text-gray-800 shadow">
            正在读取停车记录……
          </div>
        ) : records.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-white p-5 text-gray-700 shadow">
            暂无停车记录
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {records.map((record) => (
              <div
                key={record.id}
                className="rounded-2xl bg-white p-5 shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900">
                      {record.drivers
                        ? `${record.drivers.driver_code} · ${record.drivers.name}`
                        : "未关联司机"}
                    </p>

                    <p className="mt-1 text-sm font-medium text-emerald-700">
                      {eventTypeText(record.event_type)}
                    </p>
                  </div>

                  <span className="text-sm text-gray-600">
                    {formatDateTime(record.recorded_at)}
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-gray-50 p-4">
                  <p className="font-medium text-gray-900">
                    {record.location_name || "未填写地点名称"}
                  </p>

                  <p className="mt-2 text-sm text-gray-700">
                    纬度：{record.latitude ?? "未记录"}
                  </p>

                  <p className="mt-1 text-sm text-gray-700">
                    经度：{record.longitude ?? "未记录"}
                  </p>

                  {record.mileage !== null && (
                    <p className="mt-1 text-sm text-gray-700">
                      公里数：{record.mileage} km
                    </p>
                  )}
                </div>

                <div className="mt-4 text-sm text-gray-700">
                  <p>
                    车辆：
                    {record.vehicles
                      ? `${record.vehicles.vehicle_code} · ${record.vehicles.plate_number}`
                      : "未关联"}
                  </p>

                  <p className="mt-1">
                    行程：
                    {record.trips?.trip_number || "未关联"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
