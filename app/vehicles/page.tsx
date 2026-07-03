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
    <main className="min-h-screen bg-emerald-50 p-5">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              管理员端
            </p>

            <h1 className="text-2xl font-bold text-gray-900">
              车辆资料管理
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
          <div className="mt-5 rounded-2xl bg-white p-5 text-gray-800 shadow">
            正在读取车辆资料……
          </div>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-[260px_1fr]">
            <section className="rounded-2xl bg-white p-4 shadow">
              <h2 className="font-bold text-gray-900">
                车辆列表（{vehicles.length}台）
              </h2>

              <div className="mt-4 space-y-3">
                {vehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => selectVehicle(vehicle)}
                    className={`w-full rounded-xl border p-4 text-left ${
                      selectedId === vehicle.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <p className="font-bold text-gray-900">
                      {vehicle.vehicle_code} · {vehicle.model}
                    </p>

                    <p className="mt-1 text-sm text-gray-700">
                      {vehicle.plate_number}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      状态：{vehicle.status}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  编辑车辆资料
                </h2>

                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
                  {selectedVehicle?.vehicle_code || "未选择"}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="font-medium text-gray-800">
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
                    className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="font-medium text-gray-800">
                    车型
                  </span>

                  <input
                    value={form.model}
                    onChange={(event) =>
                      updateField("model", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="font-medium text-gray-800">
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
                      className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                    />
                  </label>

                  <label className="block">
                    <span className="font-medium text-gray-800">
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
                      className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="font-medium text-gray-800">
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
                      className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                    />
                  </label>

                  <label className="block">
                    <span className="font-medium text-gray-800">
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
                      className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="font-medium text-gray-800">
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
                      className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                    />
                  </label>

                  <label className="block">
                    <span className="font-medium text-gray-800">
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
                      className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="font-medium text-gray-800">
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
                      className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                    />
                  </label>

                  <label className="block">
                    <span className="font-medium text-gray-800">
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
                      className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                    />
                  </label>
                </div>

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
                  onClick={saveVehicle}
                  disabled={saving || !selectedId}
                  className="w-full rounded-xl bg-emerald-600 p-3 font-bold text-white disabled:opacity-50"
                >
                  {saving
                    ? "正在保存……"
                    : "保存车辆资料"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
