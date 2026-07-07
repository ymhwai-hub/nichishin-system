"use client";

import { useEffect, useState } from "react";
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

export default function ParkingPage() {
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

    setRecords((data as ParkingRecord[]) ?? []);
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

      const loadedTrips = (tripData as Trip[]) ?? [];
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
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setMessage("当前位置获取成功");
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
    <main className="min-h-screen bg-emerald-50 p-5">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-600">司机端</p>
            <h1 className="text-2xl font-bold text-gray-900">
              停车地点登记
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

        <div className="mt-5 rounded-3xl bg-white p-5 shadow">
          <h2 className="font-bold text-gray-900">登记当前位置</h2>

          {loading ? (
            <p className="mt-4 text-gray-500">正在读取资料……</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-800">
                  关联行程
                </label>

                <select
                  value={selectedTripId}
                  onChange={(event) =>
                    setSelectedTripId(event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-500"
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
                <label className="mb-1 block text-sm font-medium text-gray-800">
                  登记类型
                </label>

                <select
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-500"
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
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-500"
              />

              <input
                value={mileage}
                onChange={(event) => setMileage(event.target.value)}
                type="number"
                placeholder="当前公里数，可不填"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-500"
              />

              <button
                onClick={getCurrentLocation}
                disabled={locating}
                className="w-full rounded-xl bg-blue-500 py-3 font-bold text-white disabled:opacity-50"
              >
                {locating ? "正在定位……" : "获取当前位置"}
              </button>

              {latitude && longitude && (
                <div className="rounded-xl bg-gray-50 p-4 text-sm font-medium text-gray-800">
                  <p>纬度：{latitude}</p>
                  <p className="mt-1">经度：{longitude}</p>
                </div>
              )}

              {message && (
                <p className="rounded-xl bg-gray-50 p-3 text-sm font-medium text-gray-800">
                  {message}
                </p>
              )}

              <button
                onClick={saveParkingRecord}
                disabled={saving}
                className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-white disabled:opacity-50"
              >
                {saving ? "正在保存……" : "保存停车地点"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-6">
          <h2 className="font-bold text-gray-900">最近登记记录</h2>

          {records.length === 0 ? (
            <div className="mt-3 rounded-2xl bg-white p-5 text-gray-700 shadow">
              暂无停车地点记录
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="rounded-2xl bg-white p-5 shadow"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-gray-900">
                      {eventTypeText(record.event_type)}
                    </p>

                    <span className="text-xs text-gray-600">
                      {formatDateTime(record.recorded_at)}
                    </span>
                  </div>

                  <p className="mt-3 text-gray-700">
                    {record.location_name || "未填写地点名称"}
                  </p>

                  <p className="mt-2 text-sm text-gray-700">
                    GPS：{record.latitude}, {record.longitude}
                  </p>

                  {record.mileage !== null && (
                    <p className="mt-1 text-sm text-gray-700">
                      公里数：{record.mileage} km
                    </p>
                  )}

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
