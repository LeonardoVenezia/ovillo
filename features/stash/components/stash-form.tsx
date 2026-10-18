"use client";

import { ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { selectStyles } from "@/components/select-styles";
import { Textarea } from "@/components/ui/textarea";
import { COLOR_FAMILIES, type ColorFamily } from "@/db/stash-schema";
import { YARN_WEIGHTS, type YarnWeight } from "@/db/yarn-schema";
import {
  chipIdle,
  chipSelected,
  chipStyles,
} from "@/features/projects/components/chip-styles";
import { uploadPhoto } from "@/features/projects/upload-photo";
import type { YarnOption } from "@/features/yarn/queries";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import { createStashItem, removeStashPhoto, updateStashItem } from "../actions";
import { colorFamilySwatch } from "../colors";
import type { StashListItem } from "../queries";
import {
  parseCountInput,
  STASH_GRAMS_MAX,
  STASH_METERS_MAX,
  STASH_SKEINS_MAX,
} from "../schemas";

/**
 * Alta y edición de una lana del inventario (spec §5.7). Lo que no se elige
 * se manda en `null`; el servidor vuelve a validar todo. Con lana del
 * catálogo, los metros se sugieren desde la etiqueta y el servidor completa
 * gramos y metros si vinieron vacíos.
 */

export function StashForm({
  item,
  yarnOptions,
  onDone,
}: {
  item?: StashListItem;
  yarnOptions: YarnOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState<"catalog" | "free">(
    item && item.yarnId === null ? "free" : "catalog",
  );
  const [yarnId, setYarnId] = useState(item?.yarnId ?? "");
  const [customName, setCustomName] = useState(item?.customName ?? "");
  const [weight, setWeight] = useState<YarnWeight | "">(item?.weight ?? "");
  const [colorFamily, setColorFamily] = useState<ColorFamily | "">(
    item?.colorFamily ?? "",
  );
  const [colorway, setColorway] = useState(item?.colorway ?? "");
  const [dyeLot, setDyeLot] = useState(item?.dyeLot ?? "");
  const [skeins, setSkeins] = useState(
    item?.skeins === null || item?.skeins === undefined
      ? ""
      : String(item.skeins),
  );
  const [grams, setGrams] = useState(
    item?.grams === null || item?.grams === undefined ? "" : String(item.grams),
  );
  const [location, setLocation] = useState(item?.location ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");

  // Metros: se completan solos desde el catálogo hasta que se toquen a mano.
  const [meters, setMeters] = useState(
    item?.metersTotal === null || item?.metersTotal === undefined
      ? ""
      : String(item.metersTotal),
  );
  const [metersTouched, setMetersTouched] = useState(() => {
    if (!item) {
      return false;
    }
    const auto =
      item.yarn && item.yarn.meters !== null && item.skeins !== null
        ? item.yarn.meters * item.skeins
        : null;
    return !(auto !== null && item.metersTotal === auto);
  });

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [busy, setBusy] = useState(false);

  const selectedYarn =
    source === "catalog"
      ? (yarnOptions.find((option) => option.id === yarnId) ?? null)
      : null;

  function changeSkeins(value: string) {
    setSkeins(value);
    if (!metersTouched && selectedYarn && selectedYarn.meters !== null) {
      const parsed = parseCountInput(value);
      if (typeof parsed === "number") {
        setMeters(
          String(Math.min(parsed * selectedYarn.meters, STASH_METERS_MAX)),
        );
      } else if (value.trim() === "") {
        setMeters("");
      }
    }
  }

  function changeYarn(value: string) {
    setYarnId(value);
    const option = yarnOptions.find((candidate) => candidate.id === value);
    if (!metersTouched && option && option.meters !== null) {
      const parsed = parseCountInput(skeins);
      if (typeof parsed === "number") {
        setMeters(String(Math.min(parsed * option.meters, STASH_METERS_MAX)));
      }
    }
  }

  function choosePhoto(next: File | null) {
    setFile(next);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
    if (next) {
      setRemovePhoto(false);
    }
  }

  /** Valida las cantidades y devuelve el error a mostrar, o `null` si está bien. */
  function parseField(
    value: string,
    max: number,
    rangeMessage: string,
  ): { value: number | null } | { error: string } {
    const parsed = parseCountInput(value);
    if (parsed === "invalid") {
      return { error: rangeMessage };
    }
    if (parsed !== null && parsed > max) {
      return { error: rangeMessage };
    }
    return { value: parsed };
  }

  async function submit() {
    if (source === "catalog" && yarnId === "") {
      toast.error(es.stash.errors.yarnRequired);
      return;
    }
    if (source === "free" && customName.trim() === "") {
      toast.error(es.stash.errors.customNameRequired);
      return;
    }

    const skeinsParsed = parseField(
      skeins,
      STASH_SKEINS_MAX,
      es.stash.errors.skeinsRange,
    );
    if ("error" in skeinsParsed) {
      toast.error(skeinsParsed.error);
      return;
    }
    const gramsParsed = parseField(
      grams,
      STASH_GRAMS_MAX,
      es.stash.errors.gramsRange,
    );
    if ("error" in gramsParsed) {
      toast.error(gramsParsed.error);
      return;
    }
    const metersParsed = parseField(
      meters,
      STASH_METERS_MAX,
      es.stash.errors.metersRange,
    );
    if ("error" in metersParsed) {
      toast.error(metersParsed.error);
      return;
    }
    if (skeinsParsed.value === null && gramsParsed.value === null) {
      toast.error(es.stash.errors.quantityRequired);
      return;
    }

    const input = {
      yarnId: source === "catalog" ? yarnId : null,
      customName: source === "free" ? customName.trim() : null,
      weight: source === "free" && weight !== "" ? weight : null,
      colorFamily: colorFamily === "" ? null : colorFamily,
      colorway: colorway.trim() === "" ? null : colorway.trim(),
      dyeLot: dyeLot.trim() === "" ? null : dyeLot.trim(),
      skeins: skeinsParsed.value,
      grams: gramsParsed.value,
      metersTotal: metersParsed.value,
      location: location.trim() === "" ? null : location.trim(),
      notes: notes.trim() === "" ? null : notes.trim(),
    };

    setBusy(true);
    try {
      let id: string;
      if (item) {
        const result = await updateStashItem({ id: item.id, ...input });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        id = item.id;
      } else {
        const result = await createStashItem(input);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        id = result.id;
      }

      if (file) {
        const uploaded = await uploadPhoto({
          stashItemId: id,
          purpose: "lana",
          file,
        });
        if (!uploaded.ok) {
          toast.error(uploaded.error);
        }
      } else if (removePhoto && item?.imageThumbUrl) {
        const removed = await removeStashPhoto(id);
        if (!removed.ok) {
          toast.error(removed.error);
        }
      }

      toast.success(item ? es.stash.saved : es.stash.created);
      onDone();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const idPrefix = item ? `stash-edit-${item.id}` : "stash-new";
  const photoUrl =
    previewUrl ?? (removePhoto ? null : (item?.imageThumbUrl ?? null));
  const hasPhoto = photoUrl !== null;

  return (
    <div
      className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-4"
      data-testid={item ? "stash-edit-form" : "stash-new-form"}
    >
      <p className="font-medium">
        {item ? es.stash.editTitle : es.stash.newTitle}
      </p>

      <div className="flex flex-col gap-2">
        <Label id={`${idPrefix}-source-label`}>{es.stash.sourceLabel}</Label>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-labelledby={`${idPrefix}-source-label`}
        >
          <button
            type="button"
            aria-pressed={source === "catalog"}
            data-testid="stash-source-catalog"
            className={cn(
              chipStyles,
              source === "catalog" ? chipSelected : chipIdle,
            )}
            onClick={() => setSource("catalog")}
          >
            {es.stash.sourceCatalog}
          </button>
          <button
            type="button"
            aria-pressed={source === "free"}
            data-testid="stash-source-free"
            className={cn(
              chipStyles,
              source === "free" ? chipSelected : chipIdle,
            )}
            onClick={() => setSource("free")}
          >
            {es.stash.sourceFree}
          </button>
        </div>
        <p className="text-muted-foreground text-xs">
          {source === "catalog"
            ? es.stash.sourceCatalogHint
            : es.stash.sourceFreeHint}
        </p>
      </div>

      {source === "catalog" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-yarn`}>{es.stash.yarnLabel}</Label>
          {yarnOptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">{es.stash.yarnNone}</p>
          ) : (
            <select
              id={`${idPrefix}-yarn`}
              data-testid="stash-yarn"
              className={selectStyles}
              value={yarnId}
              onChange={(event) => changeYarn(event.target.value)}
            >
              <option value="">{es.stash.yarnPlaceholder}</option>
              {yarnOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {es.stash.yarnOption
                    .replace("{brand}", option.brandName)
                    .replace("{name}", option.name)}
                </option>
              ))}
            </select>
          )}
          {selectedYarn ? (
            <p
              className="text-muted-foreground text-xs"
              data-testid="stash-yarn-suggestion"
            >
              {selectedYarn.meters !== null && selectedYarn.grams !== null
                ? es.stash.yarnSuggestion
                    .replace("{meters}", String(selectedYarn.meters))
                    .replace("{grams}", String(selectedYarn.grams))
                : selectedYarn.meters !== null
                  ? es.stash.yarnSuggestionMeters.replace(
                      "{meters}",
                      String(selectedYarn.meters),
                    )
                  : es.yarns.weights[selectedYarn.weight]}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-custom-name`}>
              {es.stash.customNameLabel}
            </Label>
            <Input
              id={`${idPrefix}-custom-name`}
              data-testid="stash-custom-name"
              maxLength={80}
              placeholder={es.stash.customNamePlaceholder}
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label id={`${idPrefix}-weight-label`}>
              {es.stash.weightFreeLabel}
            </Label>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-labelledby={`${idPrefix}-weight-label`}
            >
              <button
                type="button"
                aria-pressed={weight === ""}
                data-testid="stash-weight-none"
                className={cn(
                  chipStyles,
                  weight === "" ? chipSelected : chipIdle,
                )}
                onClick={() => setWeight("")}
              >
                {es.stash.weightNone}
              </button>
              {YARN_WEIGHTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={weight === value}
                  data-testid={`stash-weight-${value}`}
                  className={cn(
                    chipStyles,
                    weight === value ? chipSelected : chipIdle,
                  )}
                  onClick={() => setWeight(value)}
                >
                  {es.yarns.weights[value]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label id={`${idPrefix}-color-label`}>
          {es.stash.colorFamilyLabel}
        </Label>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-labelledby={`${idPrefix}-color-label`}
        >
          <button
            type="button"
            aria-pressed={colorFamily === ""}
            data-testid="stash-color-none"
            className={cn(
              chipStyles,
              colorFamily === "" ? chipSelected : chipIdle,
            )}
            onClick={() => setColorFamily("")}
          >
            {es.stash.colorFamilyNone}
          </button>
          {COLOR_FAMILIES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={colorFamily === value}
              data-testid={`stash-color-${value}`}
              className={cn(
                chipStyles,
                "inline-flex items-center gap-1.5",
                colorFamily === value ? chipSelected : chipIdle,
              )}
              onClick={() => setColorFamily(value)}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-3.5 rounded-full",
                  colorFamilySwatch[value],
                )}
              />
              {es.stash.colors[value]}
            </button>
          ))}
        </div>
        <Input
          data-testid="stash-colorway"
          maxLength={60}
          placeholder={es.stash.colorwayPlaceholder}
          aria-label={es.stash.colorwayLabel}
          value={colorway}
          onChange={(event) => setColorway(event.target.value)}
          className="mt-1 sm:max-w-xs"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label id={`${idPrefix}-quantity-label`}>
          {es.stash.quantityTitle}
        </Label>
        <div
          className="grid gap-4 sm:grid-cols-3"
          role="group"
          aria-labelledby={`${idPrefix}-quantity-label`}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-skeins`} className="font-normal">
              {es.stash.skeinsLabel}
            </Label>
            <Input
              id={`${idPrefix}-skeins`}
              data-testid="stash-skeins"
              inputMode="numeric"
              value={skeins}
              onChange={(event) => changeSkeins(event.target.value)}
              className="w-full sm:w-28"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-grams`} className="font-normal">
              {es.stash.gramsLabel}
            </Label>
            <Input
              id={`${idPrefix}-grams`}
              data-testid="stash-grams"
              inputMode="numeric"
              value={grams}
              onChange={(event) => setGrams(event.target.value)}
              className="w-full sm:w-28"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-meters`} className="font-normal">
              {es.stash.metersLabel}
            </Label>
            <Input
              id={`${idPrefix}-meters`}
              data-testid="stash-meters"
              inputMode="numeric"
              value={meters}
              onChange={(event) => {
                setMeters(event.target.value);
                setMetersTouched(true);
              }}
              className="w-full sm:w-28"
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          {source === "catalog"
            ? es.stash.catalogQuantityHint
            : es.stash.quantityHint}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-dye-lot`}>{es.stash.dyeLotLabel}</Label>
          <Input
            id={`${idPrefix}-dye-lot`}
            data-testid="stash-dye-lot"
            maxLength={60}
            placeholder={es.stash.dyeLotPlaceholder}
            value={dyeLot}
            onChange={(event) => setDyeLot(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-location`}>
            {es.stash.locationLabel}
          </Label>
          <Input
            id={`${idPrefix}-location`}
            data-testid="stash-location"
            maxLength={80}
            placeholder={es.stash.locationPlaceholder}
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-notes`}>{es.stash.notesLabel}</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          data-testid="stash-notes"
          rows={2}
          maxLength={300}
          placeholder={es.stash.notesPlaceholder}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>{es.stash.photoLabel}</Label>
        <div className="flex flex-wrap items-center gap-3">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- miniatura pública de R2
            <img
              src={photoUrl}
              alt=""
              className="border-border size-20 rounded-xl border object-cover"
              data-testid="stash-photo-preview"
            />
          ) : null}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            data-testid="stash-photo-input"
            onChange={(event) => choosePhoto(event.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInput.current?.click()}
            data-testid="stash-photo-choose"
          >
            <ImagePlus aria-hidden="true" />
            {hasPhoto ? es.stash.photoReplace : es.stash.photoChoose}
          </Button>
          {hasPhoto ? (
            <Button
              type="button"
              variant="ghost"
              data-testid="stash-photo-remove"
              onClick={() => {
                choosePhoto(null);
                setRemovePhoto(true);
              }}
            >
              {es.stash.photoRemove}
            </Button>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">{es.stash.photoHint}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="lg"
          disabled={busy}
          onClick={submit}
          data-testid="stash-save"
        >
          {busy ? es.stash.saving : item ? es.stash.save : es.stash.create}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="ghost"
          disabled={busy}
          onClick={onDone}
        >
          {es.stash.cancel}
        </Button>
      </div>
    </div>
  );
}
