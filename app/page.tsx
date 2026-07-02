"use client";

import { useState } from "react";

type Language = "zh" | "ja";
type Role = "admin" | "driver";
type View =
  | "home"
  | "trips"
  | "tripDetail"
  | "vehicle"
  | "receipts"
  | "mileage"
  | "cash"
  | "reminders";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState<Language>("zh");
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<Role>("driver");
  const [view, setView] = useState<View>("home");
  const [error, setError] = useState("");

  const zh = language === "zh";

  function handleLogin() {
    if (username === "admin" && password === "123456") {
      setRole("admin");
      setLoggedIn(true);
      setView("home");
      setError("");
      return;
    }

    if (username === "D001" && password === "123456") {
      setRole("driver");
      setLoggedIn(true);
      setView("home");
      setError("");
      return;
    }

    setError(zh ? "用户名或密码错误" : "ユーザー名またはパスワードが違います");
  }

  function logout() {
    setLoggedIn(false);
    setPassword("");
    setView("home");
  }

  if (!loggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-emerald-50 p-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500 text-3xl font-bold text-white">
              日
            </div>

            <h1 className="mt-5 text-3xl font-bold text-gray-900">
              {zh ? "日辰系统" : "日辰システム"}
            </h1>

            <p className="mt-2 text-sm tracking-widest text-gray-500">
              NICHISHIN SYSTEM
            </p>
          </div>

          <div className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm text-gray-700">
                {zh ? "用户名" : "ユーザー名"}
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                type="text"
                placeholder={zh ? "请输入用户名" : "ユーザー名を入力"}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-700">
                {zh ? "密码" : "パスワード"}
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder={zh ? "请输入密码" : "パスワードを入力"}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-emerald-500"
              />
            </div>

            {error && (
              <p className="text-center text-sm text-red-500">{error}</p>
            )}

            <button
              onClick={handleLogin}
              className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white"
            >
              {zh ? "登录" : "ログイン"}
            </button>
          </div>

          <div className="mt-6 flex justify-center gap-3 text-sm">
            <button
              onClick={() => setLanguage("zh")}
              className={language === "zh" ? "text-emerald-600" : "text-gray-400"}
            >
              中文
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setLanguage("ja")}
              className={language === "ja" ? "text-emerald-600" : "text-gray-400"}
            >
              日本語
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            © 日辰株式会社
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-emerald-50 p-5">
      <div className="mx-auto max-w-md">
        {view === "home" && (
          <>
            <div className="rounded-3xl bg-emerald-500 p-6 text-white shadow-lg">
              <p className="text-sm opacity-80">
                {role === "admin"
                  ? zh
                    ? "管理员"
                    : "管理者"
                  : zh
                    ? "司机"
                    : "運転手"}
              </p>

              <h1 className="mt-2 text-2xl font-bold">
                {zh ? "欢迎使用日辰系统" : "日辰システムへようこそ"}
              </h1>

              <p className="mt-2 text-sm">
                {username} · {role === "admin" ? "日辰株式会社" : "CAR001"}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <MenuCard
                title={zh ? "今日行程" : "本日の運行"}
                value="3"
                onClick={() => setView("trips")}
              />

              <MenuCard
                title={zh ? "当前车辆" : "現在の車両"}
                value="CAR001"
                onClick={() => setView("vehicle")}
              />

              <MenuCard
                title={zh ? "待上传小票" : "未提出領収書"}
                value="2"
                onClick={() => setView("receipts")}
              />

              <MenuCard
                title={zh ? "待上传公里数" : "未提出走行距離"}
                value="1"
                onClick={() => setView("mileage")}
              />

              <MenuCard
                title={zh ? "代收现金" : "現金回収"}
                value="¥10,000"
                onClick={() => setView("cash")}
              />

              <MenuCard
                title={zh ? "到期提醒" : "期限通知"}
                value="4"
                onClick={() => setView("reminders")}
              />
            </div>

            <button
              onClick={logout}
              className="mt-6 w-full rounded-xl bg-white py-3 font-semibold text-gray-700 shadow"
            >
              {zh ? "退出登录" : "ログアウト"}
            </button>
          </>
        )}

        {view === "trips" && (
          <Page title={zh ? "今日行程" : "本日の運行"} onBack={() => setView("home")}>
            <TripCard
              time="09:00"
              route="中部国际机场 → 名古屋万豪酒店"
              customer="张先生 · 4人 · 4件行李"
              status="待执行"
              onClick={() => setView("tripDetail")}
            />

            <TripCard
              time="13:30"
              route="名古屋站 → LEGOLAND Japan"
              customer="李女士 · 3人 · 2件行李"
              status="待执行"
              onClick={() => setView("tripDetail")}
            />

            <TripCard
              time="18:00"
              route="名古屋东急酒店 → 中部国际机场"
              customer="王先生 · 2人 · 2件行李"
              status="待执行"
              onClick={() => setView("tripDetail")}
            />
          </Page>
        )}

        {view === "tripDetail" && (
          <Page title={zh ? "行程详情" : "運行詳細"} onBack={() => setView("trips")}>
            <InfoRow label="订单编号" value="R20260702001" />
            <InfoRow label="订单类型" value="接送机" />
            <InfoRow label="客户姓名" value="张先生" />
            <InfoRow label="客户电话" value="090-1234-5678" />
            <InfoRow label="航班号" value="MU291" />
            <InfoRow label="人数" value="4人" />
            <InfoRow label="行李" value="4件" />
            <InfoRow label="车辆" value="CAR001 / ALPHARD" />
            <InfoRow label="出发地" value="中部国际机场 T1" />
            <InfoRow label="目的地" value="名古屋万豪酒店" />

            <button className="mt-5 w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white">
              开始行程
            </button>
          </Page>
        )}

        {view === "vehicle" && (
          <Page title={zh ? "当前车辆" : "現在の車両"} onBack={() => setView("home")}>
            <InfoRow label="车辆编号" value="CAR001" />
            <InfoRow label="车牌号码" value="名古屋 300 あ 5008" />
            <InfoRow label="车型" value="Toyota ALPHARD" />
            <InfoRow label="颜色" value="黑色" />
            <InfoRow label="当前公里数" value="216,582 km" />
            <InfoRow label="燃料类型" value="汽油" />
            <InfoRow label="ETC卡号" value="**** 8821" />
            <InfoRow label="下次保养" value="2026/09/15" />
            <InfoRow label="车检到期" value="2027/06/30" />
          </Page>
        )}

        {view === "receipts" && (
          <Page title={zh ? "上传小票" : "領収書提出"} onBack={() => setView("home")}>
            <FormLabel text="费用类型" />
            <select className="w-full rounded-xl border bg-white px-4 py-3">
              <option>停车费</option>
              <option>高速费</option>
              <option>加油费</option>
              <option>其他</option>
            </select>

            <FormLabel text="金额（日元）" />
            <input
              type="number"
              placeholder="请输入金额"
              className="w-full rounded-xl border px-4 py-3"
            />

            <FormLabel text="小票照片" />
            <input
              type="file"
              accept="image/*"
              className="w-full rounded-xl border bg-white px-4 py-3"
            />

            <FormLabel text="备注" />
            <textarea
              placeholder="请输入备注"
              className="h-24 w-full rounded-xl border px-4 py-3"
            />

            <button className="mt-5 w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white">
              提交小票
            </button>
          </Page>
        )}

        {view === "mileage" && (
          <Page title={zh ? "公里数登记" : "走行距離登録"} onBack={() => setView("home")}>
            <FormLabel text="当前公里数" />
            <input
              type="number"
              placeholder="例如：216582"
              className="w-full rounded-xl border px-4 py-3"
            />

            <FormLabel text="仪表盘照片" />
            <input
              type="file"
              accept="image/*"
              className="w-full rounded-xl border bg-white px-4 py-3"
            />

            <p className="mt-3 text-sm text-gray-500">
              后续将增加照片自动识别公里数功能。
            </p>

            <button className="mt-5 w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white">
              保存公里数
            </button>
          </Page>
        )}

        {view === "cash" && (
          <Page title={zh ? "代收现金" : "現金回収"} onBack={() => setView("home")}>
            <FormLabel text="币种" />
            <select className="w-full rounded-xl border bg-white px-4 py-3">
              <option>日元 JPY</option>
              <option>人民币 CNY</option>
            </select>

            <FormLabel text="代收金额" />
            <input
              type="number"
              placeholder="请输入金额"
              className="w-full rounded-xl border px-4 py-3"
            />

            <FormLabel text="备注" />
            <textarea
              placeholder="请输入备注"
              className="h-24 w-full rounded-xl border px-4 py-3"
            />

            <button className="mt-5 w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white">
              保存代收款
            </button>
          </Page>
        )}

        {view === "reminders" && (
          <Page title={zh ? "到期提醒" : "期限通知"} onBack={() => setView("home")}>
            <ReminderCard
              title="驾驶证即将到期"
              description="D003 王先生 · 还有25天"
              type="司机"
            />

            <ReminderCard
              title="年度体检需要预约"
              description="D006 李先生 · 还有52天"
              type="司机"
            />

            <ReminderCard
              title="车辆保养即将到期"
              description="CAR003 · 还有12天"
              type="车辆"
            />

            <ReminderCard
              title="车辆车检即将到期"
              description="CAR005 · 还有28天"
              type="车辆"
            />
          </Page>
        )}
      </div>
    </main>
  );
}

function MenuCard({
  title,
  value,
  onClick,
}: {
  title: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl bg-white p-5 text-left shadow transition active:scale-95"
    >
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
    </button>
  );
}

function Page({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-xl bg-white px-4 py-2 text-gray-700 shadow"
        >
          ← 返回
        </button>

        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      </div>

      <div className="space-y-4">{children}</div>
    </>
  );
}

function TripCard({
  time,
  route,
  customer,
  status,
  onClick,
}: {
  time: string;
  route: string;
  customer: string;
  status: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl bg-white p-5 text-left shadow"
    >
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-emerald-600">{time}</span>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
          {status}
        </span>
      </div>

      <p className="mt-3 font-semibold text-gray-900">{route}</p>
      <p className="mt-2 text-sm text-gray-500">{customer}</p>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function FormLabel({ text }: { text: string }) {
  return <p className="pt-2 text-sm font-medium text-gray-700">{text}</p>;
}

function ReminderCard({
  title,
  description,
  type,
}: {
  title: string;
  description: string;
  type: string;
}) {
  return (
    <div className="rounded-2xl border-l-4 border-amber-500 bg-white p-5 shadow">
      <div className="flex items-center justify-between">
        <p className="font-bold text-gray-900">{title}</p>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
          {type}
        </span>
      </div>

      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  );
}
