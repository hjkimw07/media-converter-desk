"use client";

import { Link2, Unlink2 } from "lucide-react";
import { isLossyFormat } from "@/lib/image/encoders";
import type { ImageProcessOptions } from "@/types/media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

type ImageSettingsPanelProps = {
  options: ImageProcessOptions;
  onChange: (options: Partial<ImageProcessOptions>) => void;
};

export function ImageSettingsPanel({ options, onChange }: ImageSettingsPanelProps) {
  const supportsQuality = isLossyFormat(options.outputFormat);
  const isTargetSizeMode = options.compression.mode === "targetSize";

  const updateCompression = (patch: Partial<ImageProcessOptions["compression"]>) =>
    onChange({ compression: { ...options.compression, ...patch } });

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-md border border-border bg-background p-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Image output</h3>
          <Badge variant="success">Browser Canvas</Badge>
        </div>
        <Field label="Format">
          <Select
            aria-label="Image output format"
            value={options.outputFormat}
            options={[
              { value: "jpg", label: "JPG - 호환성" },
              { value: "png", label: "PNG - 무손실" },
              { value: "webp", label: "WEBP - 범용 권장" },
              { value: "avif", label: "AVIF - 사진에 최적" },
            ]}
            onChange={(event) => onChange({ outputFormat: event.currentTarget.value as ImageProcessOptions["outputFormat"] })}
          />
        </Field>
        {options.outputFormat === "avif" ? (
          <p className="text-xs text-muted-foreground">
            사진은 WEBP보다 20~30% 작아지지만, UI 스크린샷처럼 평면적인 이미지는 오히려 커질 수 있습니다. 인코딩도 WEBP보다 3~5배
            느립니다.
          </p>
        ) : null}
        {isTargetSizeMode ? null : (
          <Field label={`Quality ${options.quality}`}>
            <input
              className="w-full accent-primary"
              disabled={!supportsQuality}
              type="range"
              min={1}
              max={100}
              value={options.quality}
              onChange={(event) => onChange({ quality: Number(event.currentTarget.value) })}
            />
          </Field>
        )}
        {options.outputFormat === "jpg" ? (
          <Field label="JPG background">
            <Input
              type="color"
              value={options.backgroundColor}
              onChange={(event) => onChange({ backgroundColor: event.currentTarget.value })}
            />
          </Field>
        ) : null}
      </section>

      <Separator />

      <section className="flex flex-col gap-3 rounded-md border border-border bg-background p-3">
        <h3 className="text-sm font-semibold">Compression</h3>
        <Field label="Mode">
          <Select
            aria-label="Compression mode"
            value={options.compression.mode}
            options={[
              { value: "quality", label: "Quality - 품질 직접 지정" },
              { value: "targetSize", label: "Target size - 목표 용량 자동 맞춤" },
            ]}
            onChange={(event) =>
              updateCompression({ mode: event.currentTarget.value as ImageProcessOptions["compression"]["mode"] })
            }
          />
        </Field>
        {isTargetSizeMode ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Target size KB">
                <Input
                  aria-label="Target size KB"
                  inputMode="numeric"
                  min={1}
                  type="number"
                  value={options.compression.targetSizeKb ?? ""}
                  onChange={(event) =>
                    updateCompression({
                      targetSizeKb: event.currentTarget.value ? Number(event.currentTarget.value) : undefined,
                    })
                  }
                />
              </Field>
              <Field label="Min quality">
                <Input
                  aria-label="Min quality"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  type="number"
                  value={options.compression.minQuality}
                  onChange={(event) => updateCompression({ minQuality: Number(event.currentTarget.value) })}
                />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              {supportsQuality
                ? `해상도는 유지한 채 품질을 ${options.compression.minQuality}까지 낮춰가며 목표 용량을 맞춥니다.`
                : "PNG는 무손실이라 목표 용량을 보장할 수 없습니다. WEBP 또는 AVIF를 사용해 주세요."}
            </p>
          </>
        ) : null}
      </section>

      <Separator />

      <section className="flex flex-col gap-3 rounded-md border border-border bg-background p-3">
        <h3 className="text-sm font-semibold">Resize</h3>
        <Field label="Mode">
          <Select
            value={options.resize.mode}
            options={[
              { value: "original", label: "Original" },
              { value: "percent", label: "Percent" },
              { value: "dimensions", label: "Width / height" },
              { value: "preset", label: "Preset" },
            ]}
            onChange={(event) =>
              onChange({
                resize: {
                  ...options.resize,
                  mode: event.currentTarget.value as ImageProcessOptions["resize"]["mode"],
                },
              })
            }
          />
        </Field>
        {options.resize.mode === "percent" ? (
          <Field label="Percent">
            <Select
              value={String(options.resize.percent ?? 100)}
              options={[25, 50, 75, 100, 150, 200].map((value) => ({ value: String(value), label: `${value}%` }))}
              onChange={(event) =>
                onChange({
                  resize: {
                    ...options.resize,
                    percent: Number(event.currentTarget.value) as ImageProcessOptions["resize"]["percent"],
                  },
                })
              }
            />
          </Field>
        ) : null}
        {options.resize.mode === "preset" ? (
          <Field label="Preset">
            <Select
              value={options.resize.preset ?? "blog"}
              options={[
                { value: "thumbnail", label: "Thumbnail" },
                { value: "blog", label: "Blog" },
                { value: "social", label: "SNS" },
                { value: "banner", label: "Web banner" },
              ]}
              onChange={(event) =>
                onChange({
                  resize: {
                    ...options.resize,
                    preset: event.currentTarget.value as ImageProcessOptions["resize"]["preset"],
                  },
                })
              }
            />
          </Field>
        ) : null}
        {options.resize.mode === "dimensions" ? (
          <div className="grid grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] items-end gap-2">
            <Field label="Width">
              <Input
                inputMode="numeric"
                min={1}
                type="number"
                value={options.resize.width ?? ""}
                onChange={(event) =>
                  onChange({
                    resize: {
                      ...options.resize,
                      width: event.currentTarget.value ? Number(event.currentTarget.value) : undefined,
                    },
                  })
                }
              />
            </Field>
            <Button
              aria-label="Toggle image aspect ratio link"
              aria-pressed={options.resize.maintainAspectRatio}
              className={cnAspectButton(options.resize.maintainAspectRatio)}
              size="icon"
              title={options.resize.maintainAspectRatio ? "비율 연결 해제" : "비율 연결"}
              type="button"
              variant="secondary"
              onClick={() =>
                onChange({
                  resize: {
                    ...options.resize,
                    maintainAspectRatio: !options.resize.maintainAspectRatio,
                  },
                })
              }
            >
              {options.resize.maintainAspectRatio ? <Link2 aria-hidden="true" /> : <Unlink2 aria-hidden="true" />}
            </Button>
            <Field label="Height">
              <Input
                inputMode="numeric"
                min={1}
                type="number"
                value={options.resize.height ?? ""}
                onChange={(event) =>
                  onChange({
                    resize: {
                      ...options.resize,
                      height: event.currentTarget.value ? Number(event.currentTarget.value) : undefined,
                    },
                  })
                }
              />
            </Field>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted p-3">
          <Label>Maintain ratio</Label>
          <Switch
            aria-label="Maintain image aspect ratio"
            checked={options.resize.maintainAspectRatio}
            onCheckedChange={(checked) =>
              onChange({
                resize: {
                  ...options.resize,
                  maintainAspectRatio: checked,
                },
              })
            }
          />
        </div>
      </section>

    </div>
  );
}

function cnAspectButton(isLinked: boolean) {
  return [
    "h-10 w-10 transition-colors",
    isLinked ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
  ].join(" ");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
