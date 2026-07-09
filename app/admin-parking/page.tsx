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

      setRecords((data as unknown as ParkingRecord[]) ?? []);
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-white px-5 py-4">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-extrabold tracking-[0.25em] text-emerald-600">
                PARKING RECORDS
              </p>

              <h1 className="mt-2 text-2xl font-extrabold text-gray-900">
                停车记录
              </h1>

              <p className="mt-1 text-sm font-bold text-gray-500">
                查看司机到达、离开、停车地点、GPS坐标、车辆和关联行程。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  window.location.reload();
                }}
                className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-700 transition active:scale-95"
              >
                刷新页面
              </button>

              <a
                href="/"
                className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition active:scale-95"
              >
                返回后台
              </a>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-extrabold text-gray-400">
              记录总数
            </p>

            <p className="mt-2 text-3xl font-extrabold text-gray-900">
              {records.length}
            </p>

            <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
              停车记录
            </span>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-extrabold text-gray-400">
              到达记录
            </p>

            <p className="mt-2 text-3xl font-extrabold text-gray-900">
              {records.filter((record) => record.event_type === "arrival").length}
            </p>

            <span className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
              Arrival
            </span>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-extrabold text-gray-400">
              离开记录
            </p>

            <p className="mt-2 text-3xl font-extrabold text-gray-900">
              {records.filter((record) => record.event_type === "departure").length}
            </p>

            <span className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
              Departure
            </span>
          </div>
        </section>

        {message && (
          <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-extrabold text-red-700 shadow-sm">
            {message}
          </div>
        )}

        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-extrabold text-gray-400">
                PARKING LIST
              </p>

              <h2 className="mt-1 text-lg font-extrabold text-gray-900">
                停车记录明细
              </h2>
            </div>

            <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-extrabold text-gray-600">
              当前显示 {records.length} 条
            </span>
          </div>

          {loading ? (
            <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm font-bold text-gray-500">
              正在读取停车记录……
            </div>
          ) : records.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm font-bold text-gray-500">
              暂无停车记录
            </div>
          ) : (
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-extrabold text-emerald-700">
                        P
                      </span>

                      <div>
                        <p className="font-extrabold text-gray-900">
                          {record.drivers
                            ? `${record.drivers.driver_code} · ${record.drivers.name}`
                            : "未关联司机"}
                        </p>

                        <p className="mt-1 text-sm font-extrabold text-emerald-700">
                          {eventTypeText(record.event_type)}
                        </p>
                      </div>
                    </div>

                    <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">
                      {formatDateTime(record.recorded_at)}
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="font-extrabold text-gray-900">
                      {record.location_name || "未填写地点名称"}
                    </p>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <p className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-gray-600">
                        纬度：{record.latitude ?? "未记录"}
                      </p>

                      <p className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-gray-600">
                        经度：{record.longitude ?? "未记录"}
                      </p>
                    </div>

                    {record.latitude !== null && record.longitude !== null && (
                      <a
                        href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition active:scale-95"
                      >
                        Google地图确认位置
                      </a>
                    )}

                    {record.mileage !== null && (
                      <p className="mt-3 text-sm font-bold text-gray-600">
                        公里数：{record.mileage} km
                      </p>
                    )}
                  </div>

                  <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 text-sm font-bold text-gray-700">
                    <p>
                      车辆：
                      {record.vehicles
                        ? `${record.vehicles.vehicle_code} · ${record.vehicles.plate_number}`
                        : "未关联"}
                    </p>

                    <p className="mt-2">
                      行程：{record.trips?.trip_number || "未关联"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );}
