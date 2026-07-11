"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Driver = {
  id: string;
  driver_code: string;
  name: string;
};

type Vehicle = {
  vehicle_code: string;
  model: string;
  plate_number: string;
};

type Trip = {
  id: string;
  trip_number: string;
  trip_date: string;
  start_time: string | null;
  pickup_location: string | null;
  destination: string | null;
  status: string;
  vehicle_id: string | null;
  vehicles: Vehicle | null;
};

type ParkingRecord = {
  id: string;
  event_type: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  mileage: number | null;
  recorded_at: string;
  trips: {
    trip_number: string;
  } | null;
  vehicles: {
    vehicle_code: string;
  } | null;
};

function ParkingPageContent() {
  const searchParams = useSearchParams();
  const tripIdFromUrl = searchParams.get("tripId") ?? "";

  const [driver, setDriver] = useState<Driver | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [records, setRecords] = useState<ParkingRecord[]>([]);

  const [selectedTripId, setSelectedTripId] = useState("");
  const [eventType, setEventType] = useState("parking");
  const [locationName, setLocationName] = useState("");
  const [mileage, setMileage] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [accuracy, setAccuracy] = useState("");

  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRecords(driverId: string) {
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
        trips (
          trip_number
        ),
        vehicles (
          vehicle_code
        )
      `)
      .eq("driver_id", driverId)
      .order("recorded_at", { ascending: false })
      .limit(20);

    if (error) {
      setMessage(`读取停车记录失败：${error.message}`);
      return;
    }

    setRecords((data as unknown as ParkingRecord[]) ?? []);
  }

  useEffect(() => {
    async function initialize() {
      setLoading(true);

      const savedDriverCode =
        window.localStorage.getItem("nichishin_driver_code");

      const savedLoginText =
        window.localStorage.getItem("nichishin_login");

      const savedLogin = savedLoginText
        ? JSON.parse(savedLoginText)
        : {};

      const currentDriverCode =
        typeof savedDriverCode === "string" && savedDriverCode.trim()
          ? savedDriverCode.trim().toUpperCase()
          : typeof savedLogin.username === "string"
            ? savedLogin.username.trim().toUpperCase()
            : "";

      if (!currentDriverCode) {
        setMessage("没有读取到当前司机账号，请重新登录");
        setLoading(false);
        return;
      }

      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("id, driver_code, name")
        .eq("driver_code", currentDriverCode)
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
          start_time,
          pickup_location,
          destination,
          status,
          vehicle_id,
          vehicles (
            vehicle_code,
            model,
            plate_number
          )
        `)
        .eq("driver_id", driverData.id)
        .in("status", ["scheduled", "in_progress"])
        .order("trip_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (tripError) {
        setMessage(`读取行程失败：${tripError.message}`);
        setLoading(false);
        return;
      }

      const loadedTrips = (tripData as unknown as Trip[]) ?? [];
      setTrips(loadedTrips);

      if (
        tripIdFromUrl &&
        loadedTrips.some((trip) => trip.id === tripIdFromUrl)
      ) {
        setSelectedTripId(tripIdFromUrl);
        setMessage("已自动选择当前订单");
      } else if (loadedTrips.length > 0) {
        setSelectedTripId(loadedTrips[0].id);
      } else if (tripIdFromUrl) {
        setMessage("当前订单不在可登记停车的行程列表中");
      }

      await loadRecords(driverData.id);
      setLoading(false);
    }

    initialize();
  }, [tripIdFromUrl]);

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("当前浏览器不支持定位功能");
      return;
    }

    setLocating(true);
    setMessage("正在获取当前位置……");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracyMeters = Math.round(position.coords.accuracy);

        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setAccuracy(String(accuracyMeters));

        if (accuracyMeters > 200) {
          setMessage(
            `定位成功，但精度较差：约 ±${accuracyMeters} 米。建议重新获取，或手动填写准确地点名称。`
          );
        } else {
          setMessage(`当前位置获取成功，精度约 ±${accuracyMeters} 米`);
        }

        setLocating(false);
      },
      (error) => {
        let errorText = "无法获取当前位置";

        if (error.code === 1) {
          errorText = "定位权限被拒绝，请在Safari中允许位置权限";
        } else if (error.code === 2) {
          errorText = "暂时无法确定当前位置";
        } else if (error.code === 3) {
          errorText = "获取位置超时，请再试一次";
        }

        setAccuracy("");
        setMessage(errorText);
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  async function saveParkingRecord() {
    if (!driver) {
      setMessage("司机资料尚未加载");
      return;
    }

    if (!latitude || !longitude) {
      setMessage("请先点击“获取当前位置”");
      return;
    }

    const selectedTrip =
      trips.find((trip) => trip.id === selectedTripId) ?? null;

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("parking_records").insert({
      trip_id: selectedTrip?.id ?? null,
      driver_id: driver.id,
      vehicle_id: selectedTrip?.vehicle_id ?? null,
      event_type: eventType,
      location_name: locationName || null,
      latitude: Number(latitude),
      longitude: Number(longitude),
      mileage: mileage ? Number(mileage) : null,
      recorded_at: new Date().toISOString(),
    });

    if (error) {
      setMessage(`保存失败：${error.message}`);
      setSaving(false);
      return;
    }

    setLocationName("");
    setMileage("");
    setMessage("停车地点已经成功保存");
    setSaving(false);

    await loadRecords(driver.id);
  }

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
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold tracking-[0.25em] text-emerald-600">
                DRIVER APP
              </p>

              <h1 className="mt-2 text-2xl font-extrabold text-gray-900">
                停车地点登记
              </h1>

              <p className="mt-1 text-sm font-bold text-gray-500">
                登记到达、停车、离开位置，并保存GPS坐标和公里数。
              </p>
            </div>

            <a
              href={tripIdFromUrl ? `/driver-trips/${tripIdFromUrl}` : "/"}
              className="shrink-0 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition active:scale-95"
            >
              {tripIdFromUrl ? "返回订单" : "返回"}
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

        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-extrabold text-gray-900">登记当前位置</h2>

          {loading ? (
            <p className="mt-4 text-gray-500">正在读取资料……</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-extrabold text-gray-700">
                  关联行程
                </label>

                <select
                  value={selectedTripId}
                  onChange={(event) =>
                    setSelectedTripId(event.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-400 focus:bg-white"
                >
                  <option value="">不关联行程</option>

                  {trips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.trip_date} · {trip.pickup_location || "未填写"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-extrabold text-gray-700">
                  登记类型
                </label>

                <select
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-400 focus:bg-white"
                >
                  <option value="arrival">到达地点</option>
                  <option value="parking">停车地点</option>
                  <option value="departure">离开地点</option>
                </select>
              </div>

              <input
                value={locationName}
                onChange={(event) => setLocationName(event.target.value)}
                placeholder="地点名称，例如：名古屋万豪酒店"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-400 focus:bg-white"
              />

              <input
                value={mileage}
                onChange={(event) => setMileage(event.target.value)}
                type="number"
                placeholder="当前公里数，可不填"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-400 focus:bg-white"
              />

              <button
                onClick={getCurrentLocation}
                disabled={locating}
                className="w-full rounded-2xl bg-blue-600 py-3 font-extrabold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {locating ? "正在定位……" : "获取当前位置"}
              </button>

              {latitude && longitude && (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm font-bold text-gray-700">
                  <p>纬度：{latitude}</p>
                  <p className="mt-1">经度：{longitude}</p>

                  {accuracy && (
                    <p className="mt-1">
                      定位精度：约 ±{accuracy} 米
                    </p>
                  )}

                  {accuracy && Number(accuracy) > 200 && (
                    <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-3 font-bold text-amber-700">
                      当前定位可能有偏差。建议再点一次“获取当前位置”，或者在地点名称里手动填写准确地点。
                    </div>
                  )}

                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block rounded-2xl border border-blue-100 bg-white px-4 py-3 text-center font-extrabold text-blue-600 shadow-sm transition active:scale-95"
                  >
                    用 Google Maps 确认位置
                  </a>
                </div>
              )}

              {message && (
                <p className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm font-bold text-gray-700">
                  {message}
                </p>
              )}

              <button
                onClick={saveParkingRecord}
                disabled={saving}
                className="w-full rounded-2xl bg-emerald-600 py-3 font-extrabold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {saving ? "正在保存……" : "保存停车地点"}
              </button>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4"><h2 className="text-lg font-extrabold text-gray-900">最近登记记录</h2><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-extrabold text-gray-600">{records.length} 条</span></div>

          {records.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm font-bold text-gray-500">
              暂无停车地点记录
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-gray-900">
                      {eventTypeText(record.event_type)}
                    </p>

                    <span className="text-right text-xs font-bold text-gray-500">
                      {formatDateTime(record.recorded_at)}
                    </span>
                  </div>

                  <p className="mt-3 font-extrabold text-gray-900">
                    {record.location_name || "未填写地点名称"}
                  </p>

                  <p className="mt-2 text-sm font-bold text-gray-600">
                    GPS：{record.latitude}, {record.longitude}
                  </p>

                  {record.mileage !== null && (
                    <p className="mt-1 text-sm font-bold text-gray-600">
                      公里数：{record.mileage} km
                    </p>
                  )}

                  <p className="mt-1 text-sm font-bold text-gray-600">
                    车辆：{record.vehicles?.vehicle_code || "未关联"}
                  </p>

                  <p className="mt-1 text-xs font-bold text-gray-400">
                    行程：{record.trips?.trip_number || "未关联"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}


export default function ParkingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-white px-5 py-4">
          <div className="mx-auto max-w-3xl rounded-3xl border border-gray-100 bg-white p-5 text-sm font-bold text-gray-500 shadow-sm">
            正在打开停车登记页面……
          </div>
        </main>
      }
    >
      <ParkingPageContent />
    </Suspense>
  );
}
