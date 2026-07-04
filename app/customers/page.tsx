"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Customer = {
  id: string;
  customer_name: string;
  customer_type: string;
  source: string;
  phone: string | null;
  line_id: string | null;
  wechat_id: string | null;
  whatsapp: string | null;
  nationality: string | null;
  preferred_language: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

type CustomerForm = {
  customer_name: string;
  customer_type: string;
  source: string;
  phone: string;
  line_id: string;
  wechat_id: string;
  whatsapp: string;
  nationality: string;
  preferred_language: string;
  notes: string;
};

const emptyForm: CustomerForm = {
  customer_name: "",
  customer_type: "individual",
  source: "line",
  phone: "",
  line_id: "",
  wechat_id: "",
  whatsapp: "",
  nationality: "",
  preferred_language: "",
  notes: "",
};

const customerTypeLabels: Record<string, string> = {
  individual: "散客",
  guide: "导游",
  travel_agency: "旅行社",
  company: "企业",
  vip: "VIP",
};

const sourceLabels: Record<string, string> = {
  line: "LINE",
  wechat: "微信",
  phone: "电话",
  whatsapp: "WhatsApp",
  travel_agency: "旅行社",
  klook: "KLOOK",
  other: "其他",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadCustomers();
  }, []);

  function selectCustomer(customer: Customer) {
    setSelectedId(customer.id);

    setForm({
      customer_name: customer.customer_name || "",
      customer_type: customer.customer_type || "individual",
      source: customer.source || "line",
      phone: customer.phone || "",
      line_id: customer.line_id || "",
      wechat_id: customer.wechat_id || "",
      whatsapp: customer.whatsapp || "",
      nationality: customer.nationality || "",
      preferred_language: customer.preferred_language || "",
      notes: customer.notes || "",
    });

    setMessage("");
  }

  function startNewCustomer() {
    setSelectedId("");
    setForm(emptyForm);
    setMessage("");
  }

  async function loadCustomers(preferredId?: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .select(`
        id,
        customer_name,
        customer_type,
        source,
        phone,
        line_id,
        wechat_id,
        whatsapp,
        nationality,
        preferred_language,
        notes,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`读取客户资料失败：${error.message}`);
      setLoading(false);
      return;
    }

    const customerList = (data as Customer[]) ?? [];
    setCustomers(customerList);

    if (preferredId) {
      const target = customerList.find(
        (customer) => customer.id === preferredId
      );

      if (target) {
        selectCustomer(target);
      }
    }

    setLoading(false);
  }

  function updateField(
    field: keyof CustomerForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveCustomer() {
    if (!form.customer_name.trim()) {
      setMessage("客户姓名不能为空");
      return;
    }

    setSaving(true);
    setMessage("");

    const customerData = {
      customer_name: form.customer_name.trim(),
      customer_type: form.customer_type,
      source: form.source,
      phone: form.phone.trim() || null,
      line_id: form.line_id.trim() || null,
      wechat_id: form.wechat_id.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      nationality: form.nationality.trim() || null,
      preferred_language:
        form.preferred_language.trim() || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (selectedId) {
      const { error } = await supabase
        .from("customers")
        .update(customerData)
        .eq("id", selectedId);

      if (error) {
        setMessage(`保存失败：${error.message}`);
        setSaving(false);
        return;
      }

      setSaving(false);
      await loadCustomers(selectedId);
      setMessage("客户资料已成功保存");
      return;
    }

    const { data, error } = await supabase
      .from("customers")
      .insert(customerData)
      .select("id")
      .single();

    if (error) {
      setMessage(`新增客户失败：${error.message}`);
      setSaving(false);
      return;
    }

    setSaving(false);
    await loadCustomers(data.id);
    setMessage("新客户已成功添加");
  }

  return (
    <main className="min-h-screen bg-emerald-50 p-5">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              管理员端
            </p>

            <h1 className="text-2xl font-bold text-gray-900">
              客户资料管理
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
            正在读取客户资料……
          </div>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-[280px_1fr]">
            <section className="rounded-2xl bg-white p-4 shadow">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-bold text-gray-900">
                  客户列表（{customers.length}人）
                </h2>

                <button
                  type="button"
                  onClick={startNewCustomer}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white"
                >
                  新增
                </button>
              </div>

              {customers.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">
                  暂无客户，请点击“新增”。
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => selectCustomer(customer)}
                      className={`w-full rounded-xl border p-4 text-left ${
                        selectedId === customer.id
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <p className="font-bold text-gray-900">
                        {customer.customer_name}
                      </p>

                      <p className="mt-1 text-sm text-gray-700">
                        {customerTypeLabels[
                          customer.customer_type
                        ] || customer.customer_type}
                        {" · "}
                        {sourceLabels[customer.source] ||
                          customer.source}
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        {customer.phone ||
                          customer.line_id ||
                          customer.wechat_id ||
                          customer.whatsapp ||
                          "暂无联系方式"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white p-5 shadow">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedId
                    ? "编辑客户资料"
                    : "新增客户资料"}
                </h2>

                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
                  {selectedId ? "编辑中" : "新客户"}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="font-medium text-gray-800">
                    客户姓名
                  </span>

                  <input
                    value={form.customer_name}
                    onChange={(event) =>
                      updateField(
                        "customer_name",
                        event.target.value
                      )
                    }
                    placeholder="请输入客户姓名"
                    className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="font-medium text-gray-800">
                      客户类型
                    </span>

                    <select
                      value={form.customer_type}
                      onChange={(event) =>
                        updateField(
                          "customer_type",
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
                    >
                      <option value="individual">散客</option>
                      <option value="guide">导游</option>
                      <option value="travel_agency">
                        旅行社
                      </option>
                      <option value="company">企业</option>
                      <option value="vip">VIP</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="font-medium text-gray-800">
                      来源渠道
                    </span>

                    <select
                      value={form.source}
                      onChange={(event) =>
                        updateField(
                          "source",
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
                    >
                      <option value="line">LINE</option>
                      <option value="wechat">微信</option>
                      <option value="phone">电话</option>
                      <option value="whatsapp">
                        WhatsApp
                      </option>
                      <option value="travel_agency">
                        旅行社
                      </option>
                      <option value="klook">KLOOK</option>
                      <option value="other">其他</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="font-medium text-gray-800">
                      电话号码
                    </span>

                    <input
                      value={form.phone}
                      onChange={(event) =>
                        updateField(
                          "phone",
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                    />
                  </label>

                  <label className="block">
                    <span className="font-medium text-gray-800">
                      LINE ID
                    </span>

                    <input
                      value={form.line_id}
                      onChange={(event) =>
                        updateField(
                          "line_id",
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
                      微信号
                    </span>

                    <input
                      value={form.wechat_id}
                      onChange={(event) =>
                        updateField(
                          "wechat_id",
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                    />
                  </label>

                  <label className="block">
                    <span className="font-medium text-gray-800">
                      WhatsApp
                    </span>

                    <input
                      value={form.whatsapp}
                      onChange={(event) =>
                        updateField(
                          "whatsapp",
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
                      国籍
                    </span>

                    <input
                      value={form.nationality}
                      onChange={(event) =>
                        updateField(
                          "nationality",
                          event.target.value
                        )
                      }
                      placeholder="例如：中国、台湾、日本"
                      className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                    />
                  </label>

                  <label className="block">
                    <span className="font-medium text-gray-800">
                      常用语言
                    </span>

                    <input
                      value={form.preferred_language}
                      onChange={(event) =>
                        updateField(
                          "preferred_language",
                          event.target.value
                        )
                      }
                      placeholder="例如：中文、日文、英文"
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
                      updateField(
                        "notes",
                        event.target.value
                      )
                    }
                    rows={4}
                    className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                  />
                </label>

                <button
                  type="button"
                  onClick={saveCustomer}
                  disabled={saving}
                  className="w-full rounded-xl bg-emerald-600 p-3 font-bold text-white disabled:opacity-50"
                >
                  {saving
                    ? "正在保存……"
                    : selectedId
                      ? "保存客户资料"
                      : "添加新客户"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
