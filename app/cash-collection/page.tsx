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
  trip_date: string;
  pickup_location: string | null;
  destination: string | null;
  vehicle_id: string | null;
  vehicles:
    | {
        vehicle_code: string;
        model: string;
      }
    | null;
};

type CashRecord = {
  id: string;
  amount: number;
  currency: string;
  notes: string | null;
  expense_date: string;
  created_at: string;
  trips:
    | {
        trip_number: string;
      }
    | null;
  vehicles:
    | {
        vehicle_code: string;
      }
    | null;
};

export default function CashCollectionPage() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [records, setRecords] = useState<CashRecord[]>([]);

  const [selectedTripId, setSelectedTripId] = useState("");
  const [currency, setCurrency] = useState("JPY");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRecords(driverId: string) {
    const { data, error } = await supabase
      .from("expenses")
      .select(`
        id,
        amount,
        currency,
        notes,
        expense_date,
        created_at,
        trips (
          trip_number
        ),
        vehicles (
          vehicle_code
        )
      `)
      .eq("driver_id", driverId)
      .eq("expense_type", "cash_collection")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      setMessage(`读取代收现金记录失败：${error.message}`);
      return;
    }

    setRecords((data as CashRecord[]) ?? []);
  }

  useEffect(() => {
    async function initialize() {
      setLoading(true);

      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("id, driver_code, name")
        .eq("driver_code", "D001")
        .single();

      if (driverError || !driverData) {
        setMessage(
          `读取司机资料失败：${driverError?.message || "找不到司机"}`
        );
        setLoading(false);
        return;
      }

      setDriver(driverData);

      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .select(`
          id,
          trip_number,
          trip_date,
          pickup_location,
          destination,
          vehicle_id,
          vehicles (
            vehicle_code,
            model
          )
        `)
        .eq("driver_id", driverData.id)
        .order("trip_date", { ascending: false })
        .limit(30);

      if (tripError) {
        setMessage(`读取行程失败：${tripError.message}`);
        setLoading(false);
        return;
      }

      const loadedTrips = (tripData as Trip[]) ?? [];
      setTrips(loadedTrips);

      if (loadedTrips.length > 0) {
        setSelectedTripId(loadedTrips[0].id);
      }

      await loadRecords(driverData.id);
      setLoading(false);
    }

    initialize();
  }, []);

  async function saveCashCollection() {
    if (!driver) {
      setMessage("司机资料尚未加载");
      return;
    }

    const amountNumber = Number(amount);

    if (!amount || Number.isNaN(amountNumber) || amountNumber <= 0) {
      setMessage("请输入正确的代收现金金额");
      return;
    }

    const selectedTrip =
      trips.find((trip) => trip.id === selectedTripId) ?? null;

    setSaving(true);
    setMessage("");

    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Tokyo",
    });

    const { error } = await supabase.from("expenses").insert({
      trip_id: selectedTrip?.id ?? null,
      driver_id: driver.id,
      vehicle_id: selectedTrip?.vehicle_id ?? null,
      expense_type: "cash_collection",
      amount: amountNumber,
      currency,
      notes: notes || null,
      expense_date: today,
    });

    if (error) {
      setMessage(`保存失败：${error.message}`);
      setSaving(false);
      return;
    }

    setAmount("");
    setNotes("");
    setMessage("代收现金已经成功保存");
    setSaving(false);

    await loadRecords(driver.id);
  }

  function moneyText(value: number, moneyCurrency: string) {
    if (moneyCurrency === "CNY") {
      return `¥${Number(value).toLocaleString()} 人民币`;
    }

    return `¥${Number(value).toLocaleString()} 日元`;
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
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              司机端
            </p>

            <h1 className="text-2xl font-bold text-gray-900">
              代收现金
            </h1>
          </div>

          <a
            href="/"
            className="rounded-xl bg-white px-4 py-2 font-medium text-gray-800 shadow"
          >
            返回首页
          </a>
        </div>

        {driver && (
          <div className="mt-5 rounded-3xl bg-emerald-500 p-5 text-white shadow">
            <p className="text-sm opacity-90">当前司机</p>

            <p className="mt-2 text-xl font-bold">
              {driver.driver_code} · {driver.name}
            </p>
          </div>
        )}

        <div className="mt-5 rounded-3xl bg-white p-5 shadow">
          <h2 className="font-bold text-gray-900">
            登记代收金额
          </h2>

          {loading ? (
            <p className="mt-4 text-gray-700">正在读取资料……</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block font-medium text-gray-800">
                  关联行程
                </label>

                <select
                  value={selectedTripId}
                  onChange={(event) =>
                    setSelectedTripId(event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
                >
                  <option value="">不关联行程</option>

                  {trips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.trip_date} · {trip.trip_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-medium text-gray-800">
                  币种
                </label>

                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
                >
                  <option value="JPY">日元 JPY</option>
                  <option value="CNY">人民币 CNY</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-medium text-gray-800">
                  代收金额
                </label>

                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  type="number"
                  min="1"
                  placeholder="例如：10000"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-gray-800">
                  备注
                </label>

                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="例如：机场接机订单，客人现金支付"
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-500"
                />
              </div>

              {message && (
                <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                  {message}
                </p>
              )}

              <button
                onClick={saveCashCollection}
                disabled={saving}
                className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-white disabled:opacity-50"
              >
                {saving ? "正在保存……" : "保存代收现金"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-6">
          <h2 className="font-bold text-gray-900">
            最近代收记录
          </h2>

          {records.length === 0 ? (
            <div className="mt-3 rounded-2xl bg-white p-5 text-gray-700 shadow">
              暂无代收现金记录
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="rounded-2xl bg-white p-5 shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xl font-bold text-gray-900">
                      {moneyText(record.amount, record.currency)}
                    </p>

                    <span className="text-xs text-gray-600">
                      {formatDateTime(record.created_at)}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-gray-700">
                    备注：{record.notes || "无"}
                  </p>

                  <p className="mt-1 text-sm text-gray-700">
                    车辆：{record.vehicles?.vehicle_code || "未关联"}
                  </p>

                  <p className="mt-1 text-xs text-gray-600">
                    行程：{record.trips?.trip_number || "未关联"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
