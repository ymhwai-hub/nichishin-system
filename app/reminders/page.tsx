"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Driver = {
  id: string;
  driver_code: string;
  name: string;
  license_expiry_date: string | null;
  medical_check_date: string | null;
  next_medical_check_date: string | null;
  status: string;
};

type Vehicle = {
  id: string;
  vehicle_code: string;
  plate_number: string;
  model: string;
  insurance_expiry_date: string | null;
  inspection_expiry_date: string | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  status: string;
};

type Reminder = {
  id: string;
  category: string;
  subject: string;
  title: string;
  dueDate: string;
  daysLeft: number;
  rule: string;
};

function addMonths(dateText: string, months: number) {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCMonth(date.getUTCMonth() + months);

  return date.toISOString().slice(0, 10);
}

function addYears(dateText: string, years: number) {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCFullYear(date.getUTCFullYear() + years);

  return date.toISOString().slice(0, 10);
}

function getTodayInJapan() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function calculateDaysLeft(dueDate: string) {
  const today = new Date(`${getTodayInJapan()}T00:00:00+09:00`);
  const due = new Date(`${dueDate}T00:00:00+09:00`);

  return Math.ceil(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export default function RemindersPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setMessage("");

      const [driverResult, vehicleResult] = await Promise.all([
        supabase
          .from("drivers")
          .select(`
            id,
            driver_code,
            name,
            license_expiry_date,
            medical_check_date,
            next_medical_check_date,
            status
          `)
          .eq("status", "active")
          .order("driver_code"),

        supabase
          .from("vehicles")
          .select(`
            id,
            vehicle_code,
            plate_number,
            model,
            insurance_expiry_date,
            inspection_expiry_date,
            last_maintenance_date,
            next_maintenance_date,
            status
          `)
          .neq("status", "inactive")
          .order("vehicle_code"),
      ]);

      if (driverResult.error) {
        setMessage(`读取司机资料失败：${driverResult.error.message}`);
        setLoading(false);
        return;
      }

      if (vehicleResult.error) {
        setMessage(`读取车辆资料失败：${vehicleResult.error.message}`);
        setLoading(false);
        return;
      }

      setDrivers((driverResult.data as Driver[]) ?? []);
      setVehicles((vehicleResult.data as Vehicle[]) ?? []);
      setLoading(false);
    }

    loadData();
  }, []);

  const reminders = useMemo(() => {
    const result: Reminder[] = [];

    drivers.forEach((driver) => {
      if (driver.license_expiry_date) {
        const daysLeft = calculateDaysLeft(driver.license_expiry_date);

        if (daysLeft <= 30) {
          result.push({
            id: `license-${driver.id}`,
            category: "驾照",
            subject: `${driver.driver_code} · ${driver.name}`,
            title: "驾驶证即将到期",
            dueDate: driver.license_expiry_date,
            daysLeft,
            rule: "提前30天提醒，更新驾照后解除",
          });
        }
      }

      const nextMedicalDate =
        driver.next_medical_check_date ||
        (driver.medical_check_date
          ? addYears(driver.medical_check_date, 1)
          : null);

      if (nextMedicalDate) {
        const daysLeft = calculateDaysLeft(nextMedicalDate);

        if (daysLeft <= 60) {
          result.push({
            id: `medical-${driver.id}`,
            category: "体检",
            subject: `${driver.driver_code} · ${driver.name}`,
            title: "需要预约年度体检",
            dueDate: nextMedicalDate,
            daysLeft,
            rule: "提前2个月提醒管理人员预约",
          });
        }
      }
    });

    vehicles.forEach((vehicle) => {
      const nextMaintenanceDate =
        vehicle.next_maintenance_date ||
        (vehicle.last_maintenance_date
          ? addMonths(vehicle.last_maintenance_date, 3)
          : null);

      if (nextMaintenanceDate) {
        const daysLeft = calculateDaysLeft(nextMaintenanceDate);

        if (daysLeft <= 15) {
          result.push({
            id: `maintenance-${vehicle.id}`,
            category: "保养",
            subject: `${vehicle.vehicle_code} · ${vehicle.model}`,
            title: "车辆保养即将到期",
            dueDate: nextMaintenanceDate,
            daysLeft,
            rule: "每3个月保养，提前15天提醒",
          });
        }
      }

      if (vehicle.inspection_expiry_date) {
        const daysLeft = calculateDaysLeft(
          vehicle.inspection_expiry_date
        );

        if (daysLeft <= 30) {
          result.push({
            id: `inspection-${vehicle.id}`,
            category: "车检",
            subject: `${vehicle.vehicle_code} · ${vehicle.plate_number}`,
            title: "车辆车检即将到期",
            dueDate: vehicle.inspection_expiry_date,
            daysLeft,
            rule: "提前1个月提醒",
          });
        }
      }

      if (vehicle.insurance_expiry_date) {
        const daysLeft = calculateDaysLeft(
          vehicle.insurance_expiry_date
        );

        if (daysLeft <= 30) {
          result.push({
            id: `insurance-${vehicle.id}`,
            category: "保险",
            subject: `${vehicle.vehicle_code} · ${vehicle.plate_number}`,
            title: "车辆保险即将到期",
            dueDate: vehicle.insurance_expiry_date,
            daysLeft,
            rule: "提前1个月提醒",
          });
        }
      }
    });

    return result.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [drivers, vehicles]);

  const overdueCount = reminders.filter(
    (reminder) => reminder.daysLeft < 0
  ).length;

  const upcomingCount = reminders.filter(
    (reminder) => reminder.daysLeft >= 0
  ).length;

  function daysText(daysLeft: number) {
    if (daysLeft < 0) {
      return `已过期 ${Math.abs(daysLeft)} 天`;
    }

    if (daysLeft === 0) {
      return "今天到期";
    }

    return `还有 ${daysLeft} 天`;
  }

  function reminderStyle(daysLeft: number) {
    if (daysLeft < 0) {
      return {
        border: "border-red-500",
        badge: "bg-red-100 text-red-700",
      };
    }

    if (daysLeft <= 7) {
      return {
        border: "border-orange-500",
        badge: "bg-orange-100 text-orange-700",
      };
    }

    return {
      border: "border-amber-500",
      badge: "bg-amber-100 text-amber-700",
    };
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
              到期提醒
            </h1>
          </div>

          <a
            href="/"
            className="rounded-xl bg-white px-4 py-2 font-medium text-gray-800 shadow"
          >
            返回首页
          </a>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow">
            <p className="text-sm text-gray-700">全部提醒</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {reminders.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow">
            <p className="text-sm text-gray-700">即将到期</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">
              {upcomingCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow">
            <p className="text-sm text-gray-700">已经过期</p>
            <p className="mt-2 text-2xl font-bold text-red-600">
              {overdueCount}
            </p>
          </div>
        </div>

        {message && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-red-700">
            {message}
          </div>
        )}

        {loading ? (
          <div className="mt-5 rounded-2xl bg-white p-5 text-gray-800 shadow">
            正在检查司机和车辆到期日期……
          </div>
        ) : reminders.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-white p-6 text-center shadow">
            <p className="text-lg font-bold text-emerald-700">
              当前没有到期提醒
            </p>

            <p className="mt-2 text-sm text-gray-700">
              司机驾照、体检、车辆保养、车检和保险目前都正常。
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {reminders.map((reminder) => {
              const style = reminderStyle(reminder.daysLeft);

              return (
                <div
                  key={reminder.id}
                  className={`rounded-2xl border-l-4 ${style.border} bg-white p-5 shadow`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">
                        {reminder.title}
                      </p>

                      <p className="mt-1 font-medium text-gray-800">
                        {reminder.subject}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${style.badge}`}
                    >
                      {reminder.category}
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl bg-gray-50 p-4">
                    <p className="font-bold text-gray-900">
                      {daysText(reminder.daysLeft)}
                    </p>

                    <p className="mt-2 text-sm text-gray-700">
                      到期日期：{reminder.dueDate}
                    </p>

                    <p className="mt-1 text-sm text-gray-700">
                      提醒规则：{reminder.rule}
                    </p>
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
