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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-white px-5 py-4">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-extrabold tracking-[0.25em] text-emerald-600">
                CUSTOMER MANAGEMENT
              </p>

              <h1 className="mt-2 text-2xl font-extrabold text-gray-900">
                客户资料管理
              </h1>

              <p className="mt-1 text-sm font-bold text-gray-500">
                管理散客、导游、旅行社、企业客户和VIP客户资料。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startNewCustomer}
                className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-700 transition active:scale-95"
              >
                新增客户
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.reload();
                }}
                className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm font-extrabold text-gray-700 transition active:scale-95"
              >
                刷新页面
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
            正在读取客户资料……
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-extrabold text-gray-400">
                  客户总数
                </p>

                <p className="mt-2 text-3xl font-extrabold text-gray-900">
                  {customers.length}
                </p>

                <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                  已登记客户
                </span>
              </div>

              <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-extrabold text-gray-400">
                  VIP客户
                </p>

                <p className="mt-2 text-3xl font-extrabold text-gray-900">
                  {customers.filter((customer) => customer.customer_type === "vip").length}
                </p>

                <span className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
                  VIP
                </span>
              </div>

              <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-extrabold text-gray-400">
                  当前状态
                </p>

                <p className="mt-2 text-3xl font-extrabold text-gray-900">
                  {selectedId ? "编辑中" : "新增"}
                </p>

                <span className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                  {selectedId ? "修改客户资料" : "添加新客户"}
                </span>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
              <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-extrabold text-gray-400">
                      CUSTOMER LIST
                    </p>

                    <h2 className="mt-1 text-lg font-extrabold text-gray-900">
                      客户列表
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={startNewCustomer}
                    className="rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-extrabold text-white transition active:scale-95"
                  >
                    新增
                  </button>
                </div>

                {customers.length === 0 ? (
                  <p className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm font-bold text-gray-500">
                    暂无客户，请点击“新增”。
                  </p>
                ) : (
                  <div className="mt-4 max-h-[680px] space-y-3 overflow-y-auto pr-1">
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className={`w-full rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
                          selectedId === customer.id
                            ? "border-emerald-400 bg-emerald-50 shadow-sm"
                            : "border-gray-100 bg-white hover:border-emerald-100 hover:bg-emerald-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold ${
                              selectedId === customer.id
                                ? "bg-emerald-600 text-white"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            客
                          </span>

                          <div className="min-w-0">
                            <p className="truncate font-extrabold text-gray-900">
                              {customer.customer_name}
                            </p>

                            <p className="mt-1 text-xs font-bold text-gray-500">
                              {customerTypeLabels[
                                customer.customer_type
                              ] || customer.customer_type}
                              {" · "}
                              {sourceLabels[customer.source] ||
                                customer.source}
                            </p>

                            <p className="mt-1 truncate text-xs font-bold text-gray-400">
                              {customer.phone ||
                                customer.line_id ||
                                customer.wechat_id ||
                                customer.whatsapp ||
                                "暂无联系方式"}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-gray-400">
                      EDIT CUSTOMER
                    </p>

                    <h2 className="mt-1 text-lg font-extrabold text-gray-900">
                      {selectedId
                        ? "编辑客户资料"
                        : "新增客户资料"}
                    </h2>
                  </div>

                  <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-extrabold text-emerald-700">
                    {selectedId ? "编辑中" : "新客户"}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <label className="block lg:col-span-2">
                    <span className="text-sm font-extrabold text-gray-700">
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
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
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
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
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
                    <span className="text-sm font-extrabold text-gray-700">
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
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
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

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
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
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
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
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
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
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
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
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
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
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-extrabold text-gray-700">
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
                      updateField(
                        "notes",
                        event.target.value
                      )
                    }
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                  />
                </label>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-bold text-gray-400">
                    客户资料可在新增行程时关联使用。
                  </p>

                  <button
                    type="button"
                    onClick={saveCustomer}
                    disabled={saving}
                    className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
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
          </>
        )}
      </div>
    </main>
  );
}
