import { ref, computed, type Ref } from 'vue';

export interface FieldDef {
  key: string;
  title: string;
  dataIndex?: string | string[];
  width?: number;
  ellipsis?: boolean;
  fixed?: 'left' | 'right';
  required?: boolean;
  customRender?: any;
  isCustom?: boolean;
  [extra: string]: any;
}

export interface FieldConf {
  key: string;
  title: string;
  visible: boolean;
  required: boolean;
  isCustom?: boolean;
}

/**
 * Reusable composable for field pool selection (show/hide + drag-sort).
 * Persists user config to localStorage.
 * Supports dynamic custom fields via updateAllFields().
 */
export function useFieldPool(storageKey: string, initialFields: FieldDef[]) {
  let allFields = [...initialFields];
  const fieldConfig: Ref<FieldConf[]> = ref(buildConfig(allFields));
  const dragFieldIdx = ref(-1);

  function buildConfig(fields: FieldDef[]): FieldConf[] {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved: { key: string; visible: boolean; title?: string }[] = JSON.parse(raw);
        const ordered: FieldConf[] = [];
        const seen = new Set<string>();
        for (const s of saved) {
          const def = fields.find((f) => f.key === s.key);
          if (def) {
            ordered.push({
              key: def.key,
              title: s.title || def.title,
              visible: def.required ? true : s.visible,
              required: !!def.required,
              isCustom: !!def.isCustom,
            });
            seen.add(def.key);
          }
        }
        for (const def of fields) {
          if (!seen.has(def.key)) {
            ordered.push({
              key: def.key,
              title: def.title,
              visible: true,
              required: !!def.required,
              isCustom: !!def.isCustom,
            });
          }
        }
        return ordered;
      }
    } catch {
      /* ignore parse errors */
    }
    return fields.map((f) => ({
      key: f.key,
      title: f.title,
      visible: true,
      required: !!f.required,
      isCustom: !!f.isCustom,
    }));
  }

  /** Rebuild config when custom fields are loaded from DB */
  function updateAllFields(newFields: FieldDef[]) {
    allFields = [...newFields];
    fieldConfig.value = buildConfig(allFields);
  }

  function saveConfig() {
    localStorage.setItem(
      storageKey,
      JSON.stringify(fieldConfig.value.map((f) => ({ key: f.key, visible: f.visible, title: f.title }))),
    );
  }

  function onDragStart(idx: number) {
    dragFieldIdx.value = idx;
  }

  function onDragOver(idx: number) {
    if (dragFieldIdx.value < 0 || dragFieldIdx.value === idx) return;
    const list = [...fieldConfig.value];
    const [moved] = list.splice(dragFieldIdx.value, 1);
    list.splice(idx, 0, moved);
    fieldConfig.value = list;
    dragFieldIdx.value = idx;
  }

  function onDragDrop(_idx?: number) {
    dragFieldIdx.value = -1;
  }

  /** Columns ordered & filtered by current config (without action column) */
  const visibleColumns = computed(() => {
    const cols: FieldDef[] = [];
    for (const fc of fieldConfig.value) {
      if (!fc.visible) continue;
      const def = allFields.find((f) => f.key === fc.key);
      if (def) cols.push({ ...def, title: fc.title || def.title });
    }
    return cols;
  });

  function applyAndSave() {
    saveConfig();
  }

  function resetConfig() {
    fieldConfig.value = allFields.map((f) => ({
      key: f.key,
      title: f.title,
      visible: true,
      required: !!f.required,
      isCustom: !!f.isCustom,
    }));
    saveConfig();
  }

  /** Fields that are currently hidden (available to add back) */
  const hiddenFields = computed(() =>
    fieldConfig.value.filter((fc) => !fc.visible),
  );

  /** Remove (hide) a field by key */
  function removeField(key: string) {
    const fc = fieldConfig.value.find((f) => f.key === key);
    if (fc && !fc.required) {
      fc.visible = false;
      saveConfig();
    }
  }

  /** Add (show) a hidden field by key */
  function addField(key: string) {
    const fc = fieldConfig.value.find((f) => f.key === key);
    if (fc) {
      fc.visible = true;
      saveConfig();
    }
  }

  return {
    fieldConfig,
    dragFieldIdx,
    onDragStart,
    onDragOver,
    onDragDrop,
    visibleColumns,
    hiddenFields,
    addField,
    removeField,
    applyAndSave,
    resetConfig,
    updateAllFields,
  };
}
