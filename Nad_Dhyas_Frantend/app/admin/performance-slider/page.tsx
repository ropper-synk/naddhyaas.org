'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '../dashboard/AdminLayout'
import styles from './PerformanceSlider.module.css'

interface SliderImage {
    id: number
    image_url: string
    sort_order: number
    created_at: string
}

export default function PerformanceSliderPage() {
    const [images, setImages] = useState<SliderImage[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [fileInputKey, setFileInputKey] = useState(0)

    const fetchImages = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/performance-slider')
            const data = await res.json()
            if (data.success) setImages(data.images || [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchImages()
    }, [])

    const imageSrc = (img: SliderImage) => {
        if (img.image_url.startsWith('http')) return img.image_url
        const path = encodeURIComponent(img.image_url)
        return `/api/performance-slider/image?path=${path}`
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.type)) {
            alert('Please select an image file (JPEG, PNG, GIF, WebP).')
            return
        }
        try {
            setUploading(true)
            const formData = new FormData()
            formData.append('image', file)
            const res = await fetch('/api/performance-slider', {
                method: 'POST',
                body: formData,
            })
            const data = await res.json()
            if (data.success) {
                await fetchImages()
                setFileInputKey((k) => k + 1)
            } else {
                alert(data.error || 'Failed to add image')
            }
        } catch (err) {
            console.error(err)
            alert('Failed to upload image')
        } finally {
            setUploading(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Remove this image from the Performance Opportunities slider?')) return
        try {
            const res = await fetch(`/api/performance-slider/${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) await fetchImages()
            else alert(data.error || 'Failed to delete')
        } catch (err) {
            console.error(err)
            alert('Failed to delete image')
        }
    }

    return (
        <AdminLayout title="Performance Slider">
            <div className={styles.container}>
                <div className={styles.headerSection}>
                    <div>
                        <h2>Performance Opportunities Slider</h2>
                        <p>Images shown in the Performance Opportunities section on the home page</p>
                    </div>
                </div>

                <div className={styles.actionsSection}>
                    <label className={styles.uploadButton}>
                        <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            onChange={handleUpload}
                            disabled={uploading}
                            key={fileInputKey}
                            className={styles.fileInput}
                        />
                        {uploading ? 'Adding…' : '+ Add Image'}
                    </label>
                </div>

                {loading ? (
                    <div className={styles.loading}>Loading images…</div>
                ) : images.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>No slider images yet.</p>
                        <p className={styles.emptySubtext}>Upload images above; they will appear in the Performance Opportunities section on the home page.</p>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {images.map((img) => (
                            <div key={img.id} className={styles.card}>
                                <div className={styles.cardImage}>
                                    <img src={imageSrc(img)} alt={`Slider ${img.id}`} />
                                </div>
                                <div className={styles.cardActions}>
                                    <span className={styles.order}>Order: {img.sort_order}</span>
                                    <button
                                        type="button"
                                        className={styles.deleteBtn}
                                        onClick={() => handleDelete(img.id)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
