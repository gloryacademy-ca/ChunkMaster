import {
  doc, getDoc, setDoc, updateDoc, collection,
  query, where, getDocs, orderBy, serverTimestamp, onSnapshot
} from 'firebase/firestore'
import { db } from './firebase'

// ─── USERS ──────────────────────────────────────────────
export async function getUser(userId) {
  const snap = await getDoc(doc(db, 'users', userId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function loginUser(name, pin) {
  const q = query(collection(db, 'users'),
    where('name', '==', name),
    where('pin', '==', pin))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

export async function createUser(data) {
  const ref = doc(collection(db, 'users'))
  await setDoc(ref, { ...data, createdAt: serverTimestamp() })
  return ref.id
}

export async function updateUser(userId, data) {
  await updateDoc(doc(db, 'users', userId), data)
}

// ─── CLASSES ─────────────────────────────────────────────
export async function getClasses() {
  const snap = await getDocs(collection(db, 'classes'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getClass(classId) {
  const snap = await getDoc(doc(db, 'classes', classId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function saveClass(classData) {
  if (classData.id) {
    await updateDoc(doc(db, 'classes', classData.id), classData)
    return classData.id
  } else {
    const ref = doc(collection(db, 'classes'))
    await setDoc(ref, { ...classData, createdAt: serverTimestamp() })
    return ref.id
  }
}

// ─── PROGRESS ────────────────────────────────────────────
export async function saveProgress(userId, lessonId, data) {
  const id = `${userId}_L${lessonId}`
  const existing = await getDoc(doc(db, 'progress', id))
  const prev = existing.exists() ? existing.data() : {}
  const attempts = (prev.attempts || 0) + 1
  await setDoc(doc(db, 'progress', id), {
    userId,
    lessonId,
    ...data,
    attempts,
    completedAt: serverTimestamp()
  }, { merge: true })
}

export async function getProgress(userId) {
  const q = query(collection(db, 'progress'), where('userId', '==', userId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getAllProgress() {
  const snap = await getDocs(collection(db, 'progress'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export function subscribeProgress(userId, callback) {
  const q = query(collection(db, 'progress'), where('userId', '==', userId))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export function subscribeAllProgress(callback) {
  return onSnapshot(collection(db, 'progress'), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

// ─── RANKINGS ────────────────────────────────────────────
export async function getWeeklyRankings(classId) {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const snap = await getDocs(collection(db, 'progress'))
  const entries = snap.docs
    .map(d => d.data())
    .filter(p => p.completedAt?.toDate() >= weekStart)

  const scores = {}
  entries.forEach(p => {
    if (!scores[p.userId]) scores[p.userId] = 0
    scores[p.userId] += p.totalScore || 0
  })
  return scores
}
