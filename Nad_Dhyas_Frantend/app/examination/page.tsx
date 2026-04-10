'use client'

import { useState, useEffect } from 'react'
import Header from '../components/Header'
import styles from './Examination.module.css'

interface ExamInfoItem {
  id: number
  title: string
  content: string
  examDate: string | null
  updatedAt: string | null
}

interface ExaminationData {
  success: boolean
  formEnabled: boolean
  items: ExamInfoItem[]
}

export default function ExaminationPage() {
  const [data, setData] = useState<ExaminationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/examination', { cache: 'no-store' })
        const json = await res.json()
        if (json.success) {
          setData(json)
        } else {
          setError(json.error || 'Failed to load examination info')
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load examination info')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const formatDate = (d: string | null) => {
    if (!d) return null
    try {
      const date = new Date(d)
      return isNaN(date.getTime()) ? d : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
      return d
    }
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>Examination</h1>

          {loading && <p className={styles.loading}>Loading...</p>}
          {error && <p className={styles.error}>{error}</p>}

          {!loading && data && (
            <section className={styles.infoSection}>
              {(!data.items || data.items.length === 0) ? (
                <div className={styles.infoCard}>
                  <p className={styles.noItems}>Examination information will be updated here. Please check back later.</p>
                </div>
              ) : (
                data.items.map((item) => (
                  <div key={item.id} className={styles.infoCard}>
                    <h2 className={styles.infoTitle}>{item.title || 'Examination'}</h2>
                    {item.examDate && (
                      <p className={styles.examDate}>
                        <strong>Exam Date:</strong> {formatDate(item.examDate)}
                      </p>
                    )}
                    <div className={styles.content}>
                      {item.content ? (
                        <div dangerouslySetInnerHTML={{ __html: item.content.replace(/\n/g, '<br />') }} />
                      ) : null}
                    </div>
                    {item.updatedAt && (
                      <p className={styles.updated}>Last updated: {new Date(item.updatedAt).toLocaleString()}</p>
                    )}
                  </div>
                ))
              )}
            </section>
          )}
        </div>
      </main>
    </>
  )
}
