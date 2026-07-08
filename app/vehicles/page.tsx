"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Vehicle = {
  id: string;
  vehicle_code: string;
  plate_number: string;
  model: string;
  color: string | null;
  current_mileage: number | null;
  insurance_expiry_date: string | null;
  inspection_expiry_date: string | null;
  etc_card_number: string | null;
  fuel_type: string | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  notes: string | null;
  status: string;
};

type VehicleForm = {
  plate_number: string;
  model: string;
  color: string;
  current_mileage: string;
  insurance_expiry_date: string;
  inspection_expiry_date: string;
  etc_card_number: string;
  fuel_type: string;
  last_maintenance_date: string;
  next_maintenance_date: string;
  notes: string;
};

const emptyForm: VehicleForm = {
  plate_number: "",
  model: "",
  color: "",
  current_mileage: "",
  insurance_expiry_date: "",
  inspection_expiry_date: "",
  etc_card_number: "",
  fuel_type: "",
  last_maintenance_date: "",
  next_maintenance_date: "",
  notes: "",
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<VehicleForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadVehicles();
  }, []);

  function selectVehicle(vehicle: Vehicle) {
    setSelectedId(vehicle.id);

    setForm({
      plate_number: vehicle.plate_number || "",
      model: vehicle.model || "",
      color: vehicle.color || "",
      current_mileage:
        vehicle.current_mileage === null
          ? ""
          : String(vehicle.current_mileage),
      insurance_expiry_date:
        vehicle.insurance_expiry_date || "",
      inspection_expiry_date:
        vehicle.inspection_expiry_date || "",
      etc_card_number: vehicle.etc_card_number || "",
      fuel_type: vehicle.fuel_type || "",
      last_maintenance_date:
        vehicle.last_maintenance_date || "",
      next_maintenance_date:
        vehicle.next_maintenance_date || "",
      notes: vehicle.notes || "",
    });

    setMessage("");
  }

  async function loadVehicles(preferredId?: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("vehicles")
      .select(`
        id,
        vehicle_code,
        plate_number,
        model,
        color,
        current_mileage,
        insurance_expiry_date,
        inspection_expiry_date,
        etc_card_number,
        fuel_type,
        last_maintenance_date,
        next_maintenance_date,
        notes,
        status
      `)
      .order("vehicle_code");

    if (error) {
      setMessage(`读取车辆资料失败：${error.message}`);
      setLoading(false);
      return;
    }

    const vehicleList = (data as Vehicle[]) ?? [];
    setVehicles(vehicleList);

    const target =
      vehicleList.find(
        (vehicle) => vehicle.id === preferredId
      ) || vehicleList[0];

    if (target) {
      selectVehicle(target);
    }

    setLoading(false);
  }

  function updateField(
    field: keyof VehicleForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveVehicle() {
    if (!selectedId) {
      setMessage("请先选择车辆");
      return;
    }

    if (!form.plate_number.trim()) {
      setMessage("车牌号码不能为空");
      return;
    }

    if (!form.model.trim()) {
      setMessage("车型不能为空");
      return;
    }

    const mileageText = form.current_mileage.trim();
    const mileage =
      mileageText === "" ? null : Number(mileageText);

    if (
      mileage !== null &&
      (!Number.isInteger(mileage) || mileage < 0)
    ) {
      setMessage("当前公里数必须填写0以上的整数");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("vehicles")
      .update({
        plate_number: form.plate_number.trim(),
        model: form.model.trim(),
        color: form.color.trim() || null,
        current_mileage: mileage,
        insurance_expiry_date:
          form.insurance_expiry_date || null,
        inspection_expiry_date:
          form.inspection_expiry_date || null,
        etc_card_number:
          form.etc_card_number.trim() || null,
        fuel_type: form.fuel_type.trim() || null,
        last_maintenance_date:
          form.last_maintenance_date || null,
        next_maintenance_date:
          form.next_maintenance_date || null,
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
    await loadVehicles(selectedId);
    setMessage("车辆资料已成功保存");
  }

  const selectedVehicle = vehicles.find(
    (vehicle) => vehicle.id === selectedId
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-white px-5 py-4">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-extrabold tracking-[0.25em] text-emerald-600">
                VEHICLE MANAGEMENT
              </p>
              <h1 className="mt-2 text-2xl font-extrabold text-gray-900">
                车辆资料管理
              </h1>
              <p className="mt-1 text-sm font-bold text-gray-500">
                管理车牌、车型、保险、车检、保养日期和车辆备注。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => loadVehicles(selectedId)}
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
            正在读取车辆资料……
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "车辆总数",
                  value: vehicles.length,
                  note: "已登记车辆",
                  tone: "emerald",
                },
                {
                  title: "使用中车辆",
                  value: vehicles.filter((vehicle) => vehicle.status === "active").length,
                  note: "状态 active",
                  tone: "blue",
                },
                {
                  title: "当前编辑",
                  value: selectedVehicle?.vehicle_code || "-",
                  note: selectedVehicle?.plate_number || "未选择车辆",
                  tone: "amber",
                },
              ].map((card) => {
                const colorClass =
                  card.tone === "emerald"
                    ? "bg-emerald-50 text-emerald-700"
                    : card.tone === "blue"
                      ? "bg-blue-50 text-blue-700"
                      : card.tone === "amber"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-gray-50 text-gray-700";

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

            <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
              <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-gray-400">
                      VEHICLE LIST
                    </p>
                    <h2 className="mt-1 text-lg font-extrabold text-gray-900">
                      车辆列表
                    </h2>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                    {vehicles.length} 台
                  </span>
                </div>

                <div className="mt-4 max-h-[640px] space-y-3 overflow-y-auto pr-1">
                  {vehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      type="button"
                      onClick={() => selectVehicle(vehicle)}
                      className={`w-full rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
                        selectedId === vehicle.id
                          ? "border-emerald-400 bg-emerald-50 shadow-sm"
                          : "border-gray-100 bg-white hover:border-emerald-100 hover:bg-emerald-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-extrabold ${
                            selectedId === vehicle.id
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          车
                        </span>

                        <div className="min-w-0">
                          <p className="truncate font-extrabold text-gray-900">
                            {vehicle.vehicle_code} · {vehicle.model}
                          </p>

                          <p className="mt-1 truncate text-xs font-bold text-gray-500">
                            {vehicle.plate_number}
                          </p>

                          <p className="mt-1 text-xs font-bold text-gray-400">
                            状态：{vehicle.status}
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
                      EDIT VEHICLE
                    </p>
                    <h2 className="mt-1 text-lg font-extrabold text-gray-900">
                      编辑车辆资料
                    </h2>
                  </div>

                  <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-extrabold text-emerald-700">
                    {selectedVehicle?.vehicle_code || "未选择"}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
                      车牌号码
                    </span>

                    <input
                      value={form.plate_number}
                      onChange={(event) =>
                        updateField(
                          "plate_number",
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
                      车型
                    </span>

                    <input
                      value={form.model}
                      onChange={(event) =>
                        updateField("model", event.target.value)
                      }
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
                      颜色
                    </span>

                    <input
                      value={form.color}
                      onChange={(event) =>
                        updateField(
                          "color",
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
                      当前公里数
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.current_mileage}
                      onChange={(event) =>
                        updateField(
                          "current_mileage",
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
                      保险到期日
                    </span>

                    <input
                      type="date"
                      value={form.insurance_expiry_date}
                      onChange={(event) =>
                        updateField(
                          "insurance_expiry_date",
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
                      车检到期日
                    </span>

                    <input
                      type="date"
                      value={form.inspection_expiry_date}
                      onChange={(event) =>
                        updateField(
                          "inspection_expiry_date",
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
                      燃料类型
                    </span>

                    <input
                      value={form.fuel_type}
                      onChange={(event) =>
                        updateField(
                          "fuel_type",
                          event.target.value
                        )
                      }
                      placeholder="例如：汽油、柴油"
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
                      ETC卡号
                    </span>

                    <input
                      value={form.etc_card_number}
                      onChange={(event) =>
                        updateField(
                          "etc_card_number",
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
                      上次保养日期
                    </span>

                    <input
                      type="date"
                      value={form.last_maintenance_date}
                      onChange={(event) =>
                        updateField(
                          "last_maintenance_date",
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
                      下次保养日期
                    </span>

                    <input
                      type="date"
                      value={form.next_maintenance_date}
                      onChange={(event) =>
                        updateField(
                          "next_maintenance_date",
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
                    保存后，首页提醒、车辆资料和车检信息会同步更新。
                  </p>

                  <button
                    type="button"
                    onClick={saveVehicle}
                    disabled={saving || !selectedId}
                    className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
                  >
                    {saving
                      ? "正在保存……"
                      : "保存车辆资料"}
                  </button>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );}
