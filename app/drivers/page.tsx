"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Driver = {
  id: string;
  driver_code: string;
  name: string;
  phone: string | null;
  line_id: string | null;
  avatar_url: string | null;
  license_number: string | null;
  license_expiry_date: string | null;
  medical_check_date: string | null;
  next_medical_check_date: string | null;
  status: string;
  notes: string | null;
};

type DriverForm = {
  name: string;
  phone: string;
  line_id: string;
  license_number: string;
  license_expiry_date: string;
  medical_check_date: string;
  next_medical_check_date: string;
  notes: string;
};

const emptyForm: DriverForm = {
  name: "",
  phone: "",
  line_id: "",
  license_number: "",
  license_expiry_date: "",
  medical_check_date: "",
  next_medical_check_date: "",
  notes: "",
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<DriverForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadDrivers();
  }, []);

  function selectDriver(driver: Driver) {
    setSelectedId(driver.id);
    setForm({
      name: driver.name || "",
      phone: driver.phone || "",
      line_id: driver.line_id || "",
      license_number: driver.license_number || "",
      license_expiry_date: driver.license_expiry_date || "",
      medical_check_date: driver.medical_check_date || "",
      next_medical_check_date: driver.next_medical_check_date || "",
      notes: driver.notes || "",
    });
    setMessage("");
  }

  async function loadDrivers(preferredId?: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("drivers")
      .select(`
        id,
        driver_code,
        name,
        phone,
        line_id,
        avatar_url,
        license_number,
        license_expiry_date,
        medical_check_date,
        next_medical_check_date,
        status,
        notes
      `)
      .order("driver_code");

    if (error) {
      setMessage(`读取司机资料失败：${error.message}`);
      setLoading(false);
      return;
    }

    const driverList = (data as Driver[]) ?? [];
    setDrivers(driverList);

    const target =
      driverList.find((driver) => driver.id === preferredId) ||
      driverList[0];

    if (target) {
      selectDriver(target);
    }

    setLoading(false);
  }

  function updateField(field: keyof DriverForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveDriver() {
    if (!selectedId) {
      setMessage("请先选择司机");
      return;
    }

    if (!form.name.trim()) {
      setMessage("司机姓名不能为空");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("drivers")
      .update({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        line_id: form.line_id.trim() || null,
        license_number: form.license_number.trim() || null,
        license_expiry_date: form.license_expiry_date || null,
        medical_check_date: form.medical_check_date || null,
        next_medical_check_date:
          form.next_medical_check_date || null,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedId);

    if (error) {
      setMessage(`保存失败：${error.message}`);
      setSaving(false);
      return;
    }

    setSaving(false);
    await loadDrivers(selectedId);
    setMessage("司机资料已成功保存");
  }

  const selectedDriver = drivers.find(
    (driver) => driver.id === selectedId
  );

  return (
    <main className="min-h-screen bg-emerald-50 p-5">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              管理员端
            </p>
            <h1 className="text-2xl font-bold text-gray-900">
              司机资料管理
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
          <div
            className={`mt-5 rounded-2xl p-4 ${
              message.includes("成功")
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        {loading ? (
          <div className="mt-5 rounded-2xl bg-white p-5 shadow">
            正在读取司机资料……
          </div>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-[240px_1fr]">
            <section className="rounded-2xl bg-white p-4 shadow">
              <h2 className="font-bold text-gray-900">
                司机列表（{drivers.length}人）
              </h2>

              <div className="mt-4 space-y-3">
                {drivers.map((driver) => (
                  <button
                    key={driver.id}
                    type="button"
                    onClick={() => selectDriver(driver)}
                    className={`w-full rounded-xl border p-4 text-left ${
                      selectedId === driver.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <p className="font-bold text-gray-900">
                      {driver.driver_code} · {driver.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      状态：{driver.status}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  编辑司机资料
                </h2>

                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
                  {selectedDriver?.driver_code || "未选择"}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="font-medium text-gray-800">
                    姓名
                  </span>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="font-medium text-gray-800">
                    电话号码
                  </span>
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="font-medium text-gray-800">
                    LINE
                  </span>
                  <input
                    value={form.line_id}
                    onChange={(event) =>
                      updateField("line_id", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="font-medium text-gray-800">
                    驾照号码
                  </span>
                  <input
                    value={form.license_number}
                    onChange={(event) =>
                      updateField(
                        "license_number",
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="font-medium text-gray-800">
                      驾照到期日
                    </span>
                    <input
                      type="date"
                      value={form.license_expiry_date}
                      onChange={(event) =>
                        updateField(
                          "license_expiry_date",
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                    />
                  </label>

                  <label className="block">
                    <span className="font-medium text-gray-800">
                      上次体检日期
                    </span>
                    <input
                      type="date"
                      value={form.medical_check_date}
                      onChange={(event) =>
                        updateField(
                          "medical_check_date",
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="font-medium text-gray-800">
                    下次体检日期
                  </span>
                  <input
                    type="date"
                    value={form.next_medical_check_date}
                    onChange={(event) =>
                      updateField(
                        "next_medical_check_date",
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="font-medium text-gray-800">
                    备注
                  </span>
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      updateField("notes", event.target.value)
                    }
                    rows={4}
                    className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                  />
                </label>

                <button
                  type="button"
                  onClick={saveDriver}
                  disabled={saving || !selectedId}
                  className="w-full rounded-xl bg-emerald-600 p-3 font-bold text-white disabled:opacity-50"
                >
                  {saving ? "正在保存……" : "保存司机资料"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
