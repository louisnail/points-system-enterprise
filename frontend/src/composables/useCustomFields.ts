import { ref } from 'vue';
import { getCustomFields, createCustomField, updateCustomField, deleteCustomField, sortCustomFields } from '@/api/custom-field.api';

export interface CustomFieldDef {
  id: number;
  targetModule: string;
  fieldKey: string;
  displayName: string;
  fieldType: string; // text | number | date | select
  options?: string[];
  isRequired: number;
  isVisible: number;
  sortOrder: number;
}

/**
 * Composable for managing custom field definitions from the backend.
 * Provides CRUD operations and helpers to generate columns / form items.
 */
export function useCustomFields(targetModule: string) {
  const definitions = ref<CustomFieldDef[]>([]);
  const loading = ref(false);

  async function loadDefinitions() {
    loading.value = true;
    try {
      const data = await getCustomFields(targetModule) as any;
      definitions.value = Array.isArray(data) ? data : [];
    } catch {
      definitions.value = [];
    } finally {
      loading.value = false;
    }
  }

  /** Convert definitions to table column configs */
  function toColumns() {
    return definitions.value
      .filter((d) => d.isVisible)
      .map((d) => ({
        title: d.displayName,
        key: `cf_${d.fieldKey}`,
        dataIndex: ['customFields', d.fieldKey],
        width: 120,
        isCustom: true,
        fieldDef: d,
      }));
  }

  /** Convert definitions to allFields entries compatible with useFieldPool */
  function toFieldPoolEntries() {
    return definitions.value.map((d) => ({
      key: `cf_${d.fieldKey}`,
      title: d.displayName,
      width: 120,
      isCustom: true,
      required: !!d.isRequired,
      fieldDef: d,
    }));
  }

  async function addDefinition(dto: Partial<CustomFieldDef>) {
    const result = await createCustomField({ ...dto, targetModule });
    await loadDefinitions();
    return result;
  }

  async function updateDefinition(id: number, dto: Partial<CustomFieldDef>) {
    const result = await updateCustomField(id, dto);
    await loadDefinitions();
    return result;
  }

  async function removeDefinition(id: number) {
    const result = await deleteCustomField(id);
    await loadDefinitions();
    return result;
  }

  async function updateSort(items: { id: number; sortOrder: number }[]) {
    await sortCustomFields(items);
    await loadDefinitions();
  }

  return {
    definitions,
    loading,
    loadDefinitions,
    toColumns,
    toFieldPoolEntries,
    addDefinition,
    updateDefinition,
    removeDefinition,
    updateSort,
  };
}
