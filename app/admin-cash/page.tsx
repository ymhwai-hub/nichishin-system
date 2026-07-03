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
    <main className="min-h-screen bg-emerald-50 p-5">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              管理员端
            </p>

            <h1 className="text-2xl font-bold text-gray-900">
              代收现金记录
            </h1>
          </div>

          <a
            href="/"
            className="rounded-xl bg-white px-4 py-2 font-medium text-gray-800 shadow"
          >
            返回首页
          </a>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm font-medium text-gray-700">
              日元合计
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              ¥{totals.jpy.toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm font-medium text-gray-700">
              人民币合计
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              ¥{totals.cny.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-4 shadow">
          <p className="font-medium text-gray-800">
            记录数量：{records.length} 条
          </p>
        </div>

        {message && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-red-700">
            {message}
          </div>
        )}

        {loading ? (
          <div className="mt-5 rounded-2xl bg-white p-5 text-gray-800 shadow">
            正在读取代收现金记录……
          </div>
        ) : records.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-white p-5 text-gray-700 shadow">
            暂无代收现金记录
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
                    <p className="text-xl font-bold text-gray-900">
                      {moneyText(record.amount, record.currency)}
                    </p>

                    <p className="mt-1 font-medium text-emerald-700">
                      {record.drivers
                        ? `${record.drivers.driver_code} · ${record.drivers.name}`
                        : "未关联司机"}
                    </p>
                  </div>

                  <span className="text-sm text-gray-600">
                    {formatDateTime(record.created_at)}
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-800">
                    备注：{record.notes || "无"}
                  </p>

                  <p className="mt-2 text-sm text-gray-800">
                    车辆：
                    {record.vehicles
                      ? `${record.vehicles.vehicle_code} · ${record.vehicles.plate_number}`
                      : "未关联"}
                  </p>

                  <p className="mt-2 text-sm text-gray-800">
                    行程：
                    {record.trips?.trip_number || "未关联"}
                  </p>

                  {record.trips && (
                    <p className="mt-2 text-sm text-gray-700">
                      {record.trips.pickup_location || "未填写出发地"}
                      {" → "}
                      {record.trips.destination || "未填写目的地"}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-gray-600">
                    登记日期：{record.expense_date}
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
