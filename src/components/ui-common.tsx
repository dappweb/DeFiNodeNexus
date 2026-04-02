/**
 * 统一的 UI 组件和模式库
 */

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ===== 标准化的操作段卡片 =====
export interface ActionStageProps {
  stage: string;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  isLoading?: boolean;
}

export function ActionStageBadge({ stage, title, isLoading }: ActionStageProps) {
  let icon = null;
  let color = "bg-gray-500/15 text-gray-500";

  switch (stage) {
    case "checking":
      icon = <Clock className="w-4 h-4 animate-spin" />;
      color = "bg-blue-500/15 text-blue-500";
      break;
    case "approving":
      icon = <Clock className="w-4 h-4 animate-spin" />;
      color = "bg-yellow-500/15 text-yellow-500";
      break;
    case "purchasing":
      icon = <Clock className="w-4 h-4 animate-spin" />;
      color = "bg-purple-500/15 text-purple-500";
      break;
    case "confirming":
      icon = <Clock className="w-4 h-4 animate-spin" />;
      color = "bg-orange-500/15 text-orange-500";
      break;
    case "done":
      icon = <CheckCircle className="w-4 h-4" />;
      color = "bg-green-500/15 text-green-500";
      break;
    case "error":
      icon = <AlertCircle className="w-4 h-4" />;
      color = "bg-red-500/15 text-red-500";
      break;
  }

  return (
    <Badge variant="outline" className={`${color} gap-2 flex items-center`}>
      {icon}
      <span>{title}</span>
    </Badge>
  );
}

// ===== 统一的操作卡片 =====
export interface OperationCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}

export function OperationCard({
  title,
  description,
  children,
  icon,
  variant = "default",
}: OperationCardProps) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle>{title}</CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

// ===== 统一的提示框 =====
export interface AlertBoxProps {
  type: "info" | "warning" | "error" | "success";
  title: string;
  message?: string;
  icon?: React.ReactNode;
}

export function AlertBox({ type, title, message, icon }: AlertBoxProps) {
  let bgColor = "bg-blue-500/15";
  let textColor = "text-blue-600";
  let borderColor = "border-blue-200";
  let defaultIcon = <AlertCircle className="w-5 h-5" />;

  switch (type) {
    case "warning":
      bgColor = "bg-yellow-500/15";
      textColor = "text-yellow-600";
      borderColor = "border-yellow-200";
      defaultIcon = <AlertTriangle className="w-5 h-5" />;
      break;
    case "error":
      bgColor = "bg-red-500/15";
      textColor = "text-red-600";
      borderColor = "border-red-200";
      defaultIcon = <AlertCircle className="w-5 h-5" />;
      break;
    case "success":
      bgColor = "bg-green-500/15";
      textColor = "text-green-600";
      borderColor = "border-green-200";
      defaultIcon = <CheckCircle className="w-5 h-5" />;
      break;
  }

  return (
    <div className={`${bgColor} ${textColor} border ${borderColor} rounded-lg p-3 flex gap-3 text-sm`}>
      <div className="flex-shrink-0 mt-0.5">{icon || defaultIcon}</div>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        {message && <div className="text-xs opacity-90 mt-1">{message}</div>}
      </div>
    </div>
  );
}

// ===== 统一的地址显示组件 =====
export interface AddressDisplayProps {
  address: string | null;
  short?: boolean;
  copyable?: boolean;
  label?: string;
}

export function AddressDisplay({
  address,
  short = true,
  copyable = false,
  label,
}: AddressDisplayProps) {
  const displayText = short
    ? address
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : "-"
    : address || "-";

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-muted-foreground">{label}:</span>}
      <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{displayText}</code>
      {copyable && address && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 w-6 p-0"
          title="复制地址"
        >
          📋
        </Button>
      )}
    </div>
  );
}

// ===== 统一的数值输入卡片 =====
export interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  help?: string;
  error?: string;
  disabled?: boolean;
}

export function InputField({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  help,
  error,
  disabled,
}: InputFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-semibold">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-sm disabled:opacity-50"
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ===== 统一的状态指示器 =====
export interface StatusIndicatorProps {
  status: "active" | "inactive" | "loading" | "error";
  label?: string;
}

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  let color = "bg-gray-500";
  let text = "未知";

  switch (status) {
    case "active":
      color = "bg-green-500";
      text = label || "激活";
      break;
    case "inactive":
      color = "bg-gray-500";
      text = label || "禁用";
      break;
    case "loading":
      color = "bg-blue-500 animate-pulse";
      text = label || "加载中";
      break;
    case "error":
      color = "bg-red-500";
      text = label || "错误";
      break;
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs">{text}</span>
    </div>
  );
}

// ===== 统一的表格行 =====
export interface TableRowProps {
  label: string;
  value: React.ReactNode;
  help?: string;
}

export function TableRow({ label, value, help }: TableRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 text-sm">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{label}</span>
        {help && <span className="text-xs text-muted-foreground">{help}</span>}
      </div>
      <div className="text-right">{value}</div>
    </div>
  );
}
