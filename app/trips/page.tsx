"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Driver = {
  id: string;
  driver_code: string;
  name: string;
};

type Vehicle = {
  id: string;
  vehicle_code: string;
  plate_number: string;
  model: string;
};

type Customer = {
  id: string;
  customer_name: string;
  customer_type: string;
};

type Trip = {
  id: string;
  trip_number: string;
  trip_type: string;
  customer_id: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  trip_date: string;
  start_time: string | null;
  end_time: string | null;
  pickup_location: string | null;
  destination: string | null;
  passenger_count: number;
  luggage_count: number;
  status: string;
  customers:
    | {
        customer_name: string;
      }
    | null;
  drivers:
    | {
        driver_code: string;
        name: string;
      }
    | null;
  vehicles:
    | {
        vehicle_code: string;
        model: string;
      }
    | null;
};

export default function TripsPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  const [tripType, setTripType] = useState("airport_pickup");
  const [tripDate, setTripDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [passengerCount, setPassengerCount] = useState("1");
  const [luggageCount, setLuggageCount] = useState("0");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingTripId, setUpdatingTripId] = useState<string | null>(null);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredTrips = trips.filter((trip) => {
    const matchesStatus =
      statusFilter === "all" || trip.status === statusFilter;

    const customerName =
      customers.find(
        (customer) => customer.id === trip.customer_id
      )?.customer_name ?? "";

    const searchableText = [
      trip.trip_number,
      trip.flight_number ?? "",
      customerName,
      trip.pickup_location ?? "",
      trip.destination ?? "",
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      normalizedSearch === '' ||
      searchableText.includes(normalizedSearch);

    const matchesDate =
      dateFilter === "" || trip.trip_date === dateFilter;

    return matchesStatus && matchesSearch && matchesDate;
  });
  const [message, setMessage] = useState("");

  async function loadDrivers() {
    const { data, error } = await supabase
      .from("drivers")
      .select("id, driver_code, name")
      .eq("status", "active")
      .order("driver_code");

    if (error) {
      setMessage(`读取司机失败：${error.message}`);
      return;
    }

    setDrivers(data ?? []);
  }

  async function loadVehicles() {
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, vehicle_code, plate_number, model")
      .eq("status", "active")
      .order("vehicle_code");

    if (error) {
      setMessage(`读取车辆失败：${error.message}`);
      return;
    }

    setVehicles(data ?? []);
  }

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("id, customer_name, customer_type")
      .order("customer_name");

    if (error) {
      setMessage(`读取客户失败：${error.message}`);
      return;
    }

    setCustomers((data as Customer[]) ?? []);
  }

  async function loadTrips() {
    const { data: tripData, error: tripError } = await supabase
      .from("trips")
      .select(`
        id,
        trip_number,
        trip_type,
        flight_number,
        customer_id,
        driver_id,
        vehicle_id,
        trip_date,
        start_time,
        end_time,
        pickup_location,
        destination,
        passenger_count,
        luggage_count,
        status,
        drivers (
          driver_code,
          name
        ),
        vehicles (
          vehicle_code,
          model
        )
      `)
      .order("trip_date", { ascending: false })
      .order("start_time", { ascending: true });

    if (tripError) {
      setMessage(`读取行程失败：${tripError.message}`);
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
        return;
      }

      customerMap = Object.fromEntries(
        (customerData ?? []).map((customer) => [
          customer.id,
          customer.customer_name,
        ])
      );
    }

    const normalizedTrips = rows.map((row) => ({
      ...row,
      customers: row.customer_id
        ? {
            customer_name:
              customerMap[row.customer_id] ?? "客户资料不存在",
          }
        : null,
    }));

    setTrips(normalizedTrips as Trip[]);
  }

  useEffect(() => {
    async function initialize() {
      setLoading(true);

      await Promise.all([
        loadDrivers(),
        loadVehicles(),
      loadCustomers(),
        loadTrips(),
      ]);

      setLoading(false);
    }

    initialize();
  }, []);

  function nextDateString(date: string) {
    const [year, month, day] = date.split("-").map(Number);
    const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
    return nextDate.toISOString().slice(0, 10);
  }

  async function getAirportTransferOverlapWarning(
    startDateTime: string,
    endDateTime: string,
    excludeTripId?: string
  ): Promise<string> {
    const currentIsAirportTransfer =
      tripType === "airport_pickup" ||
      tripType === "airport_dropoff";

    if (!currentIsAirportTransfer) {
      return "";
    }

    let query = supabase
      .from("trips")
      .select(
        "id, trip_number, trip_type, driver_id, vehicle_id, start_time, end_time, status"
      )
      .neq("status", "cancelled");

    if (excludeTripId) {
      query = query.neq("id", excludeTripId);
    }

    const { data, error } = await query;

    if (error) {
      return `检查接送机时间提醒失败：${error.message}`;
    }

    const newStart = new Date(startDateTime).getTime();
    const newEnd = new Date(endDateTime).getTime();

    const airportTransferTrips = (data ?? []).filter(
      (trip) =>
        trip.trip_type === "airport_pickup" ||
        trip.trip_type === "airport_dropoff"
    );

    const overlappingTrips = airportTransferTrips.filter((trip) => {
      if (!trip.start_time) return false;

      const existingStart = new Date(trip.start_time).getTime();
      const existingEnd = trip.end_time
        ? new Date(trip.end_time).getTime()
        : existingStart + 2 * 60 * 60 * 1000;

      return existingStart < newEnd && existingEnd > newStart;
    });

    const driverConflict = overlappingTrips.find(
      (trip) => trip.driver_id === driverId
    );

    const vehicleConflict = overlappingTrips.find(
      (trip) => trip.vehicle_id === vehicleId
    );

    if (!driverConflict && !vehicleConflict) {
      return "";
    }

    const conflictNumbers = [
      driverConflict?.trip_number,
      vehicleConflict?.trip_number,
    ]
      .filter(Boolean)
      .filter(
        (value, index, values) =>
          values.indexOf(value) === index
      )
      .join("、");

    const orderText = conflictNumbers
      ? `（冲突订单：${conflictNumbers}）`
      : "";

    if (driverConflict && vehicleConflict) {
      return `该司机和该车辆在这个时间段已有其他接送机行程${orderText}`;
    }

    if (driverConflict) {
      return `该司机在这个时间段已有其他接送机行程${orderText}`;
    }

    return `该车辆在这个时间段已经有其他接送机行程${orderText}`;
  }

  async function getScheduleConflictMessage(
    startDateTime: string,
    endDateTime: string,
    excludeTripId?: string
  ): Promise<{
    message: string;
    allowSave: boolean;
  } | null> {
    let query = supabase
      .from("trips")
      .select(
        "id, trip_number, trip_type, driver_id, vehicle_id, start_time, end_time, status"
      )
      .neq("status", "cancelled");

    if (excludeTripId) {
      query = query.neq("id", excludeTripId);
    }

    const { data, error } = await query;

    if (error) {
      return {
        message: `检查派单冲突失败：${error.message}`,
        allowSave: false,
      };
    }

    const newStart = new Date(startDateTime).getTime();
    const newEnd = new Date(endDateTime).getTime();

    const overlappingTrips = (data ?? []).filter((trip) => {
      if (!trip.start_time) return false;

      const existingStart = new Date(trip.start_time).getTime();

      const existingEnd = trip.end_time
        ? new Date(trip.end_time).getTime()
        : existingStart + 2 * 60 * 60 * 1000;

      return existingStart < newEnd && existingEnd > newStart;
    });

    const driverConflict = overlappingTrips.find(
      (trip) => trip.driver_id === driverId
    );

    const vehicleConflict = overlappingTrips.find(
      (trip) => trip.vehicle_id === vehicleId
    );

    if (!driverConflict && !vehicleConflict) {
      return null;
    }

    const conflictNumbers = [
      driverConflict?.trip_number,
      vehicleConflict?.trip_number,
    ]
      .filter(Boolean)
      .filter(
        (value, index, values) =>
          values.indexOf(value) === index
      )
      .join("、");

    const orderText = conflictNumbers
      ? `（冲突订单：${conflictNumbers}）`
      : "";

    let message = "";

    if (driverConflict && vehicleConflict) {
      message =
        `该司机和该车辆在这个时间段已有其他行程${orderText}`;
    } else if (driverConflict) {
      message =
        `该司机在这个时间段已有其他行程${orderText}`;
    } else {
      message =
        `该车辆在这个时间段已经被分配${orderText}`;
    }

    const currentIsAirportTransfer =
      tripType === "airport_pickup" ||
      tripType === "airport_dropoff";

    const relevantConflictTrips = overlappingTrips.filter(
      (trip) =>
        trip.id === driverConflict?.id ||
        trip.id === vehicleConflict?.id
    );

    const allConflictsAreAirportTransfers =
      relevantConflictTrips.every(
        (trip) =>
          trip.trip_type === "airport_pickup" ||
          trip.trip_type === "airport_dropoff"
      );

    return {
      message,
      allowSave:
        currentIsAirportTransfer &&
        allConflictsAreAirportTransfers,
    };
  }

  async function addTrip() {
    const missingFields = [
      !tripDate ? "日期" : "",
      !startTime ? "时间" : "",
      !endTime ? "结束时间" : "",
      !customerId ? "客户" : "",
      !driverId ? "司机" : "",
      !vehicleId ? "车辆" : "",
      !pickupLocation.trim() ? "出发地点" : "",
      !destination.trim() ? "目的地" : "",
    ].filter(Boolean);

    if (missingFields.length > 0) {
      setMessage(`还缺少：${missingFields.join("、")}`);
      return;
    }

    setSaving(true);
    setMessage("");

    const tripNumber = `R${Date.now()}`;
    const startDateTime = `${tripDate}T${startTime}:00+09:00`;

    if (endTime === startTime) {
      setMessage("结束时间不能和出发时间相同");
      setSaving(false);
      return;
    }

    const endDate =
      endTime > startTime
        ? tripDate
        : nextDateString(tripDate);

    const endDateTime =
      `${endDate}T${endTime}:00+09:00`;

    const scheduleConflict =
      await getScheduleConflictMessage(startDateTime);

    const conflictWarning =
      scheduleConflict?.allowSave
        ? scheduleConflict.message
        : "";

    if (scheduleConflict && !scheduleConflict.allowSave) {
      setMessage(scheduleConflict.message);
      setSaving(false);
      return;
    }


        const airportTransferWarning =
      await getAirportTransferOverlapWarning(
        startDateTime,
        endDateTime
      );

const { error } = await supabase.from("trips").insert({
      trip_number: tripNumber,
      trip_type: tripType,
      trip_date: tripDate,
      start_time: startDateTime,
        end_time: endDateTime,
      customer_id: customerId,
      driver_id: driverId,
      vehicle_id: vehicleId,
      pickup_location: pickupLocation,
      destination,
      flight_number: flightNumber || null,
      passenger_count: Number(passengerCount || 1),
      luggage_count: Number(luggageCount || 0),
      signature_required: tripType === "charter",
      status: "scheduled",
    });

    if (error) {
      setMessage(`保存失败：${error.message}`);
      setSaving(false);
      return;
    }

    setTripDate("");
    setCustomerId("");
    setStartTime("");
    setDriverId("");
    setVehicleId("");
    setPickupLocation("");
    setDestination("");
    setFlightNumber("");
    setPassengerCount("1");
    setLuggageCount("0");

    setMessage(
      airportTransferWarning
        ? `⚠️ ${airportTransferWarning}；接送机行程已保存，请再次确认实际调度。`
        : "行程已成功保存到数据库"
    );
    setSaving(false);

    await loadTrips();
  }

  function clearTripForm() {
    setTripDate("");
    setCustomerId("");
    setStartTime("");
    setEndTime("");
    setDriverId("");
    setVehicleId("");
    setPickupLocation("");
    setDestination("");
    setFlightNumber("");
    setPassengerCount("1");
    setLuggageCount("0");
  }

  function startEditTrip(trip: Trip) {
    const editTime = new Date(trip.start_time).toLocaleTimeString(
      "en-GB",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Tokyo",
      }
    );

    const editEndTime = trip.end_time
      ? new Date(trip.end_time).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Tokyo",
        })
      : "";

    setEditingTripId(trip.id);
    setTripType(trip.trip_type);
    setTripDate(trip.trip_date);
    setStartTime(editTime);
    setEndTime(editEndTime);
    setCustomerId(trip.customer_id ?? "");
    setDriverId(trip.driver_id ?? "");
    setVehicleId(trip.vehicle_id ?? "");
    setPickupLocation(trip.pickup_location ?? "");
    setDestination(trip.destination ?? "");
    setFlightNumber(trip.flight_number ?? "");
    setPassengerCount(String(trip.passenger_count ?? 1));
    setLuggageCount(String(trip.luggage_count ?? 0));
    setMessage(`正在编辑订单：${trip.trip_number}`);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEditing() {
    setEditingTripId(null);
    clearTripForm();
    setMessage("已取消编辑");
  }

  async function saveTrip() {
    if (!editingTripId) {
      await addTrip();
      return;
    }

    const missingFields = [
      !tripDate ? "日期" : "",
      !startTime ? "时间" : "",
      !endTime ? "结束时间" : "",
      !customerId ? "客户" : "",
      !driverId ? "司机" : "",
      !vehicleId ? "车辆" : "",
      !pickupLocation.trim() ? "出发地点" : "",
      !destination.trim() ? "目的地" : "",
    ].filter(Boolean);

    if (missingFields.length > 0) {
      setMessage(`还缺少：${missingFields.join("、")}`);
      return;
    }

    setSaving(true);
    setMessage("");

    const startDateTime =
      `${tripDate}T${startTime}:00+09:00`;

    if (endTime === startTime) {
      setMessage("结束时间不能和出发时间相同");
      setSaving(false);
      return;
    }

    const endDate =
      endTime > startTime
        ? tripDate
        : nextDateString(tripDate);

    const endDateTime =
      `${endDate}T${endTime}:00+09:00`;

    const scheduleConflict =
      await getScheduleConflictMessage(
        startDateTime,
        editingTripId
      );

    const conflictWarning =
      scheduleConflict?.allowSave
        ? scheduleConflict.message
        : "";

    if (scheduleConflict && !scheduleConflict.allowSave) {
      setMessage(scheduleConflict.message);
      setSaving(false);
      return;
    }


        const airportTransferWarning =
      await getAirportTransferOverlapWarning(
        startDateTime,
        endDateTime,
        editingTripId
      );

const { error } = await supabase
      .from("trips")
      .update({
        trip_type: tripType,
        customer_id: customerId,
        driver_id: driverId,
        vehicle_id: vehicleId,
        trip_date: tripDate,
        start_time: startDateTime,
        end_time: endDateTime,
        pickup_location: pickupLocation,
        destination,
        flight_number: flightNumber || null,
        passenger_count: Number(passengerCount || 1),
        luggage_count: Number(luggageCount || 0),
        signature_required: tripType === "charter",
      })
      .eq("id", editingTripId);

    if (error) {
      setMessage(`修改失败：${error.message}`);
      setSaving(false);
      return;
    }

    setEditingTripId(null);
    clearTripForm();
    setMessage(
      airportTransferWarning
        ? `⚠️ ${airportTransferWarning}；接送机行程已保存，请再次确认实际调度。`
        : "行程资料已成功修改"
    );
    setSaving(false);
    await loadTrips();
  }

  async function cancelTrip(tripId: string) {
    const confirmed = window.confirm(
      "确定取消这个行程吗？取消后记录仍会保留。"
    );

    if (!confirmed) return;

    setUpdatingTripId(tripId);
    setMessage("");

    const { error } = await supabase
      .from("trips")
      .update({ status: "cancelled" })
      .eq("id", tripId);

    if (error) {
      setMessage(`取消失败：${error.message}`);
      setUpdatingTripId(null);
      return;
    }

    setMessage("行程已取消，记录仍然保留");
    await loadTrips();
    setUpdatingTripId(null);
  }

  async function restoreTrip(tripId: string) {
    const confirmed = window.confirm(
      "确定恢复这个已取消的行程吗？"
    );

    if (!confirmed) return;

    setUpdatingTripId(tripId);
    setMessage("");

    const { error } = await supabase
      .from("trips")
      .update({ status: "scheduled" })
      .eq("id", tripId);

    if (error) {
      setMessage(`恢复失败：${error.message}`);
      setUpdatingTripId(null);
      return;
    }

    setMessage("行程已恢复为待执行");
    await loadTrips();
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
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-600">日辰株式会社</p>
            <h1 className="text-2xl font-bold text-gray-900">
              行程管理
            </h1>
          </div>

          <a
            href="/"
            className="rounded-xl bg-white px-4 py-2 text-sm text-gray-700 shadow"
          >
            返回首页
          </a>
        </div>

        <div className="mt-5 rounded-3xl bg-white p-6 shadow">
          <h2 className="text-lg font-bold text-gray-900">
            {editingTripId ? "编辑行程" : "新增行程"}
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-800">
                行程类型
              </label>

              <select
                value={tripType}
                onChange={(event) => setTripType(event.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-gray-900"
              >
                <option value="airport_pickup">机场接机</option>
                <option value="airport_dropoff">机场送机</option>
                <option value="charter">一日包车</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-800">
                行程日期
              </label>

              <input
                type="date"
                value={tripDate}
                onChange={(event) => setTripDate(event.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-gray-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-800">
                出发时间
              </label>

              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-gray-900"
              />
            </div>

              <div>
                <label className="mb-1 block text-sm text-gray-800">
                  结束时间
                </label>

                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-gray-900"
                />
              </div>

            <div>
              <label className="mb-1 block text-sm text-gray-800">
                航班号
              </label>

              <input
                value={flightNumber}
                onChange={(event) =>
                  setFlightNumber(event.target.value.toUpperCase())
                }
                placeholder="例如 MM722"
                className="w-full rounded-xl border px-4 py-3 text-gray-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-800">
                关联客户
              </label>

              <select
                value={customerId}
                onChange={(event) =>
                  setCustomerId(event.target.value)
                }
                className="w-full rounded-xl border px-4 py-3 text-gray-900"
              >
                <option value="">请选择客户</option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.customer_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-800">
                分配司机
              </label>

              <select
                value={driverId}
                onChange={(event) => setDriverId(event.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-gray-900"
              >
                <option value="">请选择司机</option>

                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.driver_code} · {driver.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-800">
                分配车辆
              </label>

              <select
                value={vehicleId}
                onChange={(event) => setVehicleId(event.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-gray-900"
              >
                <option value="">请选择车辆</option>

                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicle_code} · {vehicle.model}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-gray-800">
                出发地点
              </label>

              <input
                value={pickupLocation}
                onChange={(event) =>
                  setPickupLocation(event.target.value)
                }
                placeholder="例如：中部国际机场 T1"
                className="w-full rounded-xl border px-4 py-3 text-gray-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-gray-800">
                目的地
              </label>

              <input
                value={destination}
                onChange={(event) =>
                  setDestination(event.target.value)
                }
                placeholder="例如：名古屋万豪酒店"
                className="w-full rounded-xl border px-4 py-3 text-gray-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-800">
                乘客人数
              </label>

              <input
                type="number"
                min="1"
                value={passengerCount}
                onChange={(event) =>
                  setPassengerCount(event.target.value)
                }
                className="w-full rounded-xl border px-4 py-3 text-gray-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-800">
                行李数量
              </label>

              <input
                type="number"
                min="0"
                value={luggageCount}
                onChange={(event) =>
                  setLuggageCount(event.target.value)
                }
                className="w-full rounded-xl border px-4 py-3 text-gray-900"
              />
            </div>
          </div>

          {message && (
            <p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-800">
              {message}
            </p>
          )}

          {message &&
            (message.includes("已有其他行程") ||
              message.includes("冲突订单") ||
              message.includes("已经被分配")) && (
              <div className="mb-4 rounded-2xl border-2 border-red-400 bg-red-50 px-4 py-4 shadow-md">
                <p className="text-base font-extrabold text-red-800">
                  ⚠️ 派单冲突
                </p>
                <p className="mt-2 break-words text-base font-bold leading-7 text-red-700">
                  {message}
                </p>
              </div>
            )}

          <button
            onClick={saveTrip}
            disabled={saving}
            className="mt-5 w-full rounded-xl bg-emerald-500 py-3 font-bold text-white disabled:opacity-50"
          >
            {saving ? "正在保存……" : "保存行程"}
          </button>

            {editingTripId && (
              <button
                type="button"
                onClick={cancelEditing}
                className="mt-3 w-full rounded-xl bg-gray-100 px-4 py-3 font-semibold text-gray-700"
              >
                取消编辑
              </button>
            )}
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-bold text-gray-900">
            已保存行程
          </h2>

          <div className="mt-3 rounded-2xl bg-white p-4 shadow">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                搜索行程
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="搜索订单编号、客户姓名或航班号"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900"
              />
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                状态筛选
              </span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900"
              >
                <option value="all">全部状态</option>
                <option value="scheduled">待执行</option>
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </label>

                        <label className="mt-3 block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                行程日期
              </span>
              <select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                aria-label="选择行程日期"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900"
              >
                <option value="">全部日期</option>
                {Array.from(
                  new Set(trips.map((trip) => trip.trip_date))
                )
                  .sort((a, b) => b.localeCompare(a))
                  .map((date) => (
                    <option key={date} value={date}>
                      {date}
                    </option>
                  ))}
              </select>
            </label>

            {(searchTerm ||
              statusFilter !== "all" ||
              dateFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setDateFilter("");
                }}
                className="mt-3 w-full rounded-xl bg-gray-100 px-4 py-3 font-semibold text-gray-700"
              >
                清除全部筛选
              </button>
            )}

<p className="mt-3 text-sm text-gray-700">
              当前显示：{filteredTrips.length} 条，共 {trips.length} 条
            </p>
          </div>

          {loading ? (
            <div className="mt-3 rounded-2xl bg-white p-5 shadow">
              正在读取行程……
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="mt-3 rounded-2xl bg-white p-5 text-gray-700 shadow">
              暂无行程
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {filteredTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="rounded-2xl bg-white p-5 shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">
                        {trip.trip_date} · {formatTime(trip.start_time)}
                    {trip.end_time
                      ? `—${formatTime(trip.end_time)}`
                      : ""}
                      </p>

                      <p className="mt-1 text-sm text-emerald-600">
                        {tripTypeText(trip.trip_type)}
                      </p>
                    </div>

                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                      {statusText(trip.status)}
                    </span>
                  </div>

                  <p className="mt-4 font-medium text-gray-900">
                    {trip.pickup_location || "未填写"}
                  </p>

                  <p className="my-1 text-sm text-gray-800">↓</p>

                  <p className="font-medium text-gray-900">
                    {trip.destination || "未填写"}
                  </p>

                  <div className="mt-4 border-t pt-3 text-sm text-gray-700">
                    <p className="mt-1">
                      客户：{customers.find(
                        (customer) => customer.id === trip.customer_id
                      )?.customer_name ?? "未关联客户"}
                    </p>

                    <p>
                      司机：
                      {trip.drivers
                        ? `${trip.drivers.driver_code} · ${trip.drivers.name}`
                        : "未分配"}
                    </p>

                    <p className="mt-1">
                      车辆：
                      {trip.vehicles
                        ? `${trip.vehicles.vehicle_code} · ${trip.vehicles.model}`
                        : "未分配"}
                    </p>

                    <p className="mt-1">
                      乘客：{trip.passenger_count}人 · 行李：
                      {trip.luggage_count}件
                    </p>

                    <p className="mt-1 text-xs text-gray-800">
                      订单编号：{trip.trip_number}
                    </p>

                    {trip.status === "cancelled" && (
                      <button
                        type="button"
                        onClick={() => restoreTrip(trip.id)}
                        disabled={updatingTripId === trip.id}
                        className="mt-4 w-full rounded-xl bg-green-100 px-4 py-3 font-semibold text-green-700 disabled:opacity-50"
                      >
                        {updatingTripId === trip.id
                          ? "正在恢复..."
                          : "恢复这个行程"}
                      </button>
                    )}


                    {trip.status !== "completed" &&
                      trip.status !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => startEditTrip(trip)}
                          className="mt-4 w-full rounded-xl bg-blue-100 px-4 py-3 font-semibold text-blue-700"
                        >
                          编辑这个行程
                        </button>
                      )}


                    {trip.status !== "completed" &&
                      trip.status !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => cancelTrip(trip.id)}
                          disabled={updatingTripId === trip.id}
                          className="mt-4 w-full rounded-xl bg-red-100 px-4 py-3 font-semibold text-red-700 disabled:opacity-50"
                        >
                          {updatingTripId === trip.id
                            ? "正在取消..."
                            : "取消这个行程"}
                        </button>
                      )}

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
