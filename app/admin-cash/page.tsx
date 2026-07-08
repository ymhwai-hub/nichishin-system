"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type CashRecord = {
  id: string;
  amount: number | string;
  currency: string;
  notes: string | null;
  expense_date: string;
  created_at: string;
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
        pickup_location: string | null;
        destination: string | null;
      }
    | null;
};

export default function AdminCashPage() {
  const [records, setRecords] = useState<CashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadRecords() {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("expenses")
        .select(`
          id,
          amount,
          currency,
          notes,
          expense_date,
          created_at,
          drivers (
            driver_code,
            name
          ),
          vehicles (
            vehicle_code,
            plate_number
          ),
          trips (
            trip_number,
            pickup_location,
            destination
          )
        `)
        .eq("expense_type", "cash_collection")
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(`读取代收现金记录失败：${error.message}`);
        setLoading(false);
        return;
      }

      setRecords((data as unknown as CashRecord[]) ?? []);
      setLoading(false);
    }

    loadRecords();
  }, []);

  const totals = useMemo(() => {
    return records.reduce(
      (result, record) => {
        const amount = Number(record.amount) || 0;

        if (record.currency === "CNY") {
          result.cny += amount;
        } else {
          result.jpy += amount;
        }

        return result;
      },
      { jpy: 0, cny: 0 }
    );
  }, [records]);

  function moneyText(value: number | string, currency: string) {
    const amount = Number(value) || 0;

    if (currency === "CNY") {
      return `¥${amount.toLocaleString()} 人民币`;
    }

    return `¥${amount.toLocaleString()} 日元`;
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
                CASH REVIEW
              </p>

              <h1 className="mt-2 text-2xl font-extrabold text-gray-900">
                代收现金记录
              </h1>

              <p className="mt-1 text-sm font-bold text-gray-500">
                查看司机代收现金、关联车辆、关联行程和登记备注。
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
              日元合计
            </p>

            <p className="mt-2 text-3xl font-extrabold text-gray-900">
              ¥{totals.jpy.toLocaleString()}
            </p>

            <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
              JPY
            </span>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-extrabold text-gray-400">
              人民币合计
            </p>

            <p className="mt-2 text-3xl font-extrabold text-gray-900">
              ¥{totals.cny.toLocaleString()}
            </p>

            <span className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
              CNY
            </span>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-extrabold text-gray-400">
              记录数量
            </p>

            <p className="mt-2 text-3xl font-extrabold text-gray-900">
              {records.length}
            </p>

            <span className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
              代收记录
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
                CASH COLLECTION LIST
              </p>

              <h2 className="mt-1 text-lg font-extrabold text-gray-900">
                现金记录明细
              </h2>
            </div>

            <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-extrabold text-gray-600">
              当前显示 {records.length} 条
            </span>
          </div>

          {loading ? (
            <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm font-bold text-gray-500">
              正在读取代收现金记录……
            </div>
          ) : records.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm font-bold text-gray-500">
              暂无代收现金记录
            </div>
          ) : (
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-2xl font-extrabold text-gray-900">
                        {moneyText(record.amount, record.currency)}
                      </p>

                      <p className="mt-2 text-sm font-extrabold text-emerald-700">
                        {record.drivers
                          ? `${record.drivers.driver_code} · ${record.drivers.name}`
                          : "未关联司机"}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">
                      {formatDateTime(record.created_at)}
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-sm font-bold text-gray-700">
                      备注：{record.notes || "无"}
                    </p>

                    <p className="mt-2 text-sm font-bold text-gray-700">
                      车辆：
                      {record.vehicles
                        ? `${record.vehicles.vehicle_code} · ${record.vehicles.plate_number}`
                        : "未关联"}
                    </p>

                    <p className="mt-2 text-sm font-bold text-gray-700">
                      行程：{record.trips?.trip_number || "未关联"}
                    </p>

                    {record.trips && (
                      <p className="mt-2 break-words text-sm font-bold leading-6 text-gray-600">
                        {record.trips.pickup_location || "未填写出发地"}
                        {" → "}
                        {record.trips.destination || "未填写目的地"}
                      </p>
                    )}

                    <p className="mt-3 text-xs font-bold text-gray-400">
                      登记日期：{record.expense_date}
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
