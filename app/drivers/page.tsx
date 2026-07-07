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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-white px-5 py-4">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-extrabold tracking-[0.25em] text-emerald-600">
                DRIVER MANAGEMENT
              </p>
              <h1 className="mt-2 text-2xl font-extrabold text-gray-900">
                司机资料管理
              </h1>
              <p className="mt-1 text-sm font-bold text-gray-500">
                管理司机联系方式、驾照到期、体检日期和内部备注。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => loadDrivers(selectedId)}
                className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-700 transition active:scale-95"
              >
                刷新资料
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

        {message && (
          <div
            className={`rounded-3xl border p-4 text-sm font-extrabold shadow-sm ${
              message.includes("成功")
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-red-100 bg-red-50 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-gray-100 bg-white p-5 text-sm font-bold text-gray-500 shadow-sm">
            正在读取司机资料……
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "司机总数",
                  value: drivers.length,
                  note: "已登记司机",
                  tone: "emerald",
                },
                {
                  title: "在职司机",
                  value: drivers.filter((driver) => driver.status === "active").length,
                  note: "状态 active",
                  tone: "blue",
                },
                {
                  title: "当前编辑",
                  value: selectedDriver?.driver_code || "-",
                  note: selectedDriver?.name || "未选择司机",
                  tone: "amber",
                },
              ].map((card) => {
                const colorClass =
                  card.tone === "emerald"
                    ? "bg-emerald-50 text-emerald-700"
                    : card.tone === "blue"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-amber-50 text-amber-700";

                return (
                  <div
                    key={card.title}
                    className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm"
                  >
                    <p className="text-xs font-extrabold text-gray-400">
                      {card.title}
                    </p>
                    <p className="mt-2 text-3xl font-extrabold text-gray-900">
                      {card.value}
                    </p>
                    <span
                      className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${colorClass}`}
                    >
                      {card.note}
                    </span>
                  </div>
                );
              })}
            </section>

            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
              <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-gray-400">
                      DRIVER LIST
                    </p>
                    <h2 className="mt-1 text-lg font-extrabold text-gray-900">
                      司机列表
                    </h2>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                    {drivers.length} 人
                  </span>
                </div>

                <div className="mt-4 max-h-[620px] space-y-3 overflow-y-auto pr-1">
                  {drivers.map((driver) => (
                    <button
                      key={driver.id}
                      type="button"
                      onClick={() => selectDriver(driver)}
                      className={`w-full rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
                        selectedId === driver.id
                          ? "border-emerald-400 bg-emerald-50 shadow-sm"
                          : "border-gray-100 bg-white hover:border-emerald-100 hover:bg-emerald-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-extrabold ${
                            selectedId === driver.id
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {driver.name?.slice(0, 1) || "司"}
                        </span>

                        <div className="min-w-0">
                          <p className="truncate font-extrabold text-gray-900">
                            {driver.driver_code} · {driver.name}
                          </p>
                          <p className="mt-1 text-xs font-bold text-gray-500">
                            状态：{driver.status}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-gray-400">
                      EDIT DRIVER
                    </p>
                    <h2 className="mt-1 text-lg font-extrabold text-gray-900">
                      编辑司机资料
                    </h2>
                  </div>

                  <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-extrabold text-emerald-700">
                    {selectedDriver?.driver_code || "未选择"}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
                      姓名
                    </span>
                    <input
                      value={form.name}
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
                      电话号码
                    </span>
                    <input
                      value={form.phone}
                      onChange={(event) =>
                        updateField("phone", event.target.value)
                      }
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
                      LINE
                    </span>
                    <input
                      value={form.line_id}
                      onChange={(event) =>
                        updateField("line_id", event.target.value)
                      }
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
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
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
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
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
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
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
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
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>
                </div>

                <label className="mt-4 block">
                  <span className="text-sm font-extrabold text-gray-700">
                    备注
                  </span>
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      updateField("notes", event.target.value)
                    }
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                  />
                </label>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-bold text-gray-400">
                    保存后，首页提醒和司机资料会同步更新。
                  </p>

                  <button
                    type="button"
                    onClick={saveDriver}
                    disabled={saving || !selectedId}
                    className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
                  >
                    {saving ? "正在保存……" : "保存司机资料"}
                  </button>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
