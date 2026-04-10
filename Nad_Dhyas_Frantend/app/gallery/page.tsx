'use client'

import Header from '../components/Header'
import Link from 'next/link'
import styles from './Gallery.module.css'

export default function GalleryPage() {
  return (
    <main className={styles.main}>
      <Header />
      <div className={styles.container}>
        <h1 className={styles.title}>Gallery</h1>
        <p className={styles.subtitle}>Photos and moments from Swargumphan Music Institute</p>
        <div className={styles.placeholder}>
          <p>Gallery content coming soon.</p>
          <Link href="/" className={styles.homeLink}>← Back to Home</Link>
        </div>
      </div>
    </main>
  )
}
