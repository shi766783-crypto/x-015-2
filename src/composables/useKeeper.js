import { computed, reactive } from 'vue'
import { createStorage } from '../services/storage'
import { config, seed } from '../data'

const storage = createStorage(config.storageKey, seed)
export function useKeeper() {
  const state = reactive(storage.read())
  const persist = () => storage.write(state)
  const add = (collection, item) => { state[collection].unshift({ id: `${collection}-${Date.now()}`, createdAt: new Date().toISOString(), ...item }); persist() }
  const update = (collection, id, patch) => { const item = state[collection].find((entry) => entry.id === id); if (item) Object.assign(item, patch); persist() }
  const remove = (collection, id) => { state[collection] = state[collection].filter((entry) => entry.id !== id); persist() }
  // 删除菜谱：移除菜谱本体；其名下的烹饪记录予以保留（历史统计不中断），
  // 但解除指向菜谱的 documentId 引用、快照菜名并标记菜谱已删除，避免悬空引用
  const removeRecipe = (id) => {
    const recipe = state.documents.find((entry) => entry.id === id)
    if (!recipe) return
    state.documents = state.documents.filter((entry) => entry.id !== id)
    state.usages = state.usages.map((entry) => entry.documentId === id
      ? { ...entry, documentId: null, recipeName: recipe.name, recipeDeleted: true }
      : entry)
    persist()
  }
  const reset = () => { Object.assign(state, structuredClone(seed)); persist() }
  const metrics = computed(() => config.metrics.map((metric) => ({ ...metric, value: metric.value ? metric.value(state) : state[metric.collection]?.length || 0 })))
  return { state, add, update, remove, removeRecipe, reset, persist, metrics }
}
