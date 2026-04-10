'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '../dashboard/AdminLayout'
import styles from './ExaminationAdmin.module.css'

interface ExamInfoItem {
  id: number
  title: string
  content: string
  examDate: string | null
  sortOrder: number
  updatedAt: string | null
}

interface ExaminationData {
  success: boolean
  formEnabled?: boolean
  items?: ExamInfoItem[]
  error?: string
}

export default function AdminExaminationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [formEnabled, setFormEnabled] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [items, setItems] = useState<ExamInfoItem[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ title: '', content: '', examDate: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [reordering, setReordering] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    const isRoot = localStorage.getItem('adminRole') === 'ROOT' || localStorage.getItem('isRootAdmin') === 'true'
    if (!isRoot) {
      router.push('/admin/login')
      return
    }
    fetchData()
  }, [router])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/examination', { cache: 'no-store' })
      const data: ExaminationData = await res.json()
      if (data.success) {
        setFormEnabled(Boolean(data.formEnabled))
        setItems(data.items || [])
      } else {
        setError(data.error || 'Failed to load')
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFormEnabled = async (enabled: boolean) => {
    if (toggling) return
    setToggling(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/examination', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formEnabled: enabled }),
      })
      const data = await res.json()
      if (data.success) {
        setFormEnabled(enabled)
        setMessage(enabled ? 'Exam registration form is now ON.' : 'Exam registration form is now OFF.')
      } else {
        setError(data.error || 'Failed to update')
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to update')
    } finally {
      setToggling(false)
    }
  }

  const openAddModal = () => {
    setEditingId(null)
    setForm({ title: '', content: '', examDate: '' })
    setModalOpen(true)
  }

  const openEditModal = (item: ExamInfoItem) => {
    setEditingId(item.id)
    setForm({
      title: item.title || '',
      content: item.content || '',
      examDate: item.examDate ? String(item.examDate).split('T')[0] : '',
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setForm({ title: '', content: '', examDate: '' })
  }

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const url = editingId
        ? `/api/admin/examination/info/${editingId}`
        : '/api/admin/examination/info'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          content: form.content,
          examDate: form.examDate || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(editingId ? 'Exam info updated.' : 'Exam info added.')
        closeModal()
        await fetchData()
      } else {
        setError(data.error || 'Failed to save')
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this exam info?')) return
    setDeletingId(id)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/examination/info/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setMessage('Exam info deleted.')
        await fetchData()
      } else {
        setError(data.error || 'Failed to delete')
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.setData('application/json', JSON.stringify({ index }))
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)
    const dragIndex = draggedIndex
    setDraggedIndex(null)
    if (dragIndex == null || dragIndex === dropIndex) return
    const newItems = [...items]
    const [removed] = newItems.splice(dragIndex, 1)
    newItems.splice(dropIndex, 0, removed)
    setItems(newItems)
    setReordering(true)
    setMessage(null)
    setError(null)
    try {
      const order = newItems.map((it) => it.id)
      const res = await fetch('/api/admin/examination/info/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      })
      const data = await res.json()
      if (data.success) {
        setItems(data.items || newItems)
        setMessage('Order updated. Top item will appear first on the public page.')
      } else {
        setError(data.error || 'Failed to reorder')
        setItems(items)
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to reorder')
      setItems(items)
    } finally {
      setReordering(false)
    }
  }

  return (
    <AdminLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Examination</h1>
          <p>Manage examination information and exam registration form visibility.</p>
        </div>

        {loading && <p className={styles.loading}>Loading...</p>}
        {error && <p className={styles.error}>{error}</p>}
        {message && <p className={styles.success}>{message}</p>}

        {!loading && (
          <>
            {/* Section 1: Examination Info */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Examination Info</h2>
              <p className={styles.sectionDesc}>Add, edit, or remove exam-related information. Drag items to set order: the first in the list appears first on the public Examination page.</p>
              <button type="button" className={styles.addBtn} onClick={openAddModal}>
                + Add Exam Info
              </button>

              {items.length === 0 ? (
                <p className={styles.noItems}>No exam info added yet. Click &quot;Add Exam Info&quot; to add one.</p>
              ) : (
                <>
                  {reordering && <p className={styles.reorderHint}>Saving order…</p>}
                  <ul className={styles.itemList}>
                    {items.map((item, index) => (
                      <li
                        key={item.id}
                        className={`${styles.itemCard} ${draggedIndex === index ? styles.itemCardDragging : ''} ${dragOverIndex === index ? styles.itemCardDragOver : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, index)}
                      >
                        <div className={styles.itemDragHandle} title="Drag to reorder">
                          <span className={styles.dragIcon}>⋮⋮</span>
                          <span className={styles.itemOrder}>{index + 1}</span>
                        </div>
                        <div className={styles.itemContent}>
                          <h3 className={styles.itemTitle}>{item.title || 'Untitled'}</h3>
                          {item.examDate && (
                            <p className={styles.itemDate}>Exam date: {new Date(item.examDate).toLocaleDateString('en-IN')}</p>
                          )}
                          {item.content && (
                            <p className={styles.itemPreview}>
                              {item.content.slice(0, 120)}
                              {item.content.length > 120 ? '…' : ''}
                            </p>
                          )}
                        </div>
                        <div className={styles.itemActions}>
                          <button
                            type="button"
                            className={styles.editBtn}
                            onClick={() => openEditModal(item)}
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                          >
                            {deletingId === item.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            {/* Section 2: Enable Exam Registration (separate) */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Exam Registration Form</h2>
              <p className={styles.sectionDesc}>
                When ON, students see the &quot;Exam Form&quot; option in the student portal and can submit exam registration. When OFF, the option is hidden.
              </p>
              <div className={styles.toggleSection}>
                <span className={styles.toggleLabel}>Enable Exam Registration</span>
                <div className={styles.toggleGroup}>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${!formEnabled ? styles.toggleBtnActive : ''}`}
                    onClick={() => handleToggleFormEnabled(false)}
                    disabled={toggling}
                  >
                    Off
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${formEnabled ? styles.toggleBtnActive : ''}`}
                    onClick={() => handleToggleFormEnabled(true)}
                    disabled={toggling}
                  >
                    On
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Modal: Add / Edit Exam Info */}
        {modalOpen && (
          <div className={styles.modalOverlay} onClick={closeModal}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.modalTitle}>{editingId ? 'Update Exam Info' : 'Add Exam Info'}</h3>
              <form onSubmit={handleSaveInfo}>
                <div className={styles.field}>
                  <label htmlFor="modal-title">Title</label>
                  <input
                    id="modal-title"
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Theory Exam Schedule"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="modal-examDate">Exam Date</label>
                  <input
                    id="modal-examDate"
                    type="date"
                    value={form.examDate}
                    onChange={(e) => setForm((p) => ({ ...p, examDate: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="modal-content">Content (when exam will happen, instructions, etc.)</label>
                  <textarea
                    id="modal-content"
                    rows={8}
                    value={form.content}
                    onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                    placeholder="Enter examination details..."
                  />
                </div>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitBtn} disabled={saving}>
                    {saving ? 'Saving…' : editingId ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
