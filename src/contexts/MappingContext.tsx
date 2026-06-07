import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { DEFAULT_CATEGORIES, defaultMappings } from '../lib/defaultMappings';
import type { StoreMapping, Category } from '../lib/defaultMappings';

interface MappingContextType {
  mappings: StoreMapping[];
  categories: string[];
  loading: boolean;
  updateMapping: (id: string, newCategory: Category) => Promise<void>;
  getCategoryForStore: (storeName: string) => Category;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;
}

const MappingContext = createContext<MappingContextType | undefined>(undefined);

export const MappingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mappings, setMappings] = useState<StoreMapping[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMappings = async () => {
    try {
      // 1. Fetch custom categories
      const settingsRef = doc(db, 'settings', 'hqCategories');
      const settingsSnap = await getDoc(settingsRef);
      let loadedCategories = [...DEFAULT_CATEGORIES];
      if (settingsSnap.exists() && settingsSnap.data().categories) {
        loadedCategories = settingsSnap.data().categories;
      } else {
        await setDoc(settingsRef, { categories: DEFAULT_CATEGORIES });
      }
      setCategories(loadedCategories);

      // 2. Fetch mappings
      const mappingRef = collection(db, 'storeMappings');
      const snapshot = await getDocs(mappingRef);

      if (snapshot.empty) {
        console.log("No mappings found in Firestore. Initializing default mappings...");
        // Initialize default mappings
        const newMappings: StoreMapping[] = [];
        for (const defaultMap of defaultMappings) {
          const newDocRef = doc(mappingRef); // Generate auto-id
          const newMapping = { ...defaultMap, id: newDocRef.id };
          await setDoc(newDocRef, newMapping);
          newMappings.push(newMapping);
        }
        setMappings(newMappings);
      } else {
        const fetchedMappings: StoreMapping[] = [];
        const categoryMigrationMap: Record<string, Category> = {
          '객실': '리조트사업본부',
          '골프': '골프사업본부',
          '식음업장': '식음',
          '티켓업장': '레져사업본부'
        };

        const nameMigrationMap: Record<string, string> = {
          '인육말가페': '얼룩말카페',
          '빙엄테이블': '밤밤테이블',
          '남도매답': '남도예담',
          '벼무새촌': '앵무새촌',
          '빙엄트릭': '밤밤트럭',
          '핏포레': '펫포레'
        };

        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data() as Omit<StoreMapping, 'id'>;
          let category = data.category;
          let storeName = data.storeName;
          let needsUpdate = false;

          // Migrate old category names
          if (categoryMigrationMap[category]) {
            category = categoryMigrationMap[category];
            needsUpdate = true;
          }

          // Migrate OCR typo store names
          if (nameMigrationMap[storeName]) {
            storeName = nameMigrationMap[storeName];
            needsUpdate = true;
          }

          if (needsUpdate) {
            await updateDoc(doc(db, 'storeMappings', docSnapshot.id), { category, storeName });
          }

          fetchedMappings.push({ id: docSnapshot.id, ...data, category, storeName });
        }

        // [14차 패치] 파이어베이스에 아직 등록되지 않은 신규 defaultMappings (예: '골프') 강제 주입 동기화
        const missingMappings = defaultMappings.filter(
          dm => !fetchedMappings.some(fm => fm.storeName === dm.storeName)
        );

        if (missingMappings.length > 0) {
          console.log(`[Auto-Sync] Adding ${missingMappings.length} missing default mappings to Firestore...`);
          for (const missing of missingMappings) {
            const newDocRef = doc(mappingRef);
            const newMapping = { ...missing, id: newDocRef.id };
            await setDoc(newDocRef, newMapping);
            fetchedMappings.push(newMapping);
          }
        }

        setMappings(fetchedMappings);
      }
    } catch (error) {
      console.error("Error fetching mappings: ", error);
      // Fallback to local default mappings if firebase fails (e.g. offline)
      setCategories([...DEFAULT_CATEGORIES]);
      setMappings(defaultMappings.map((m, i) => ({ ...m, id: `local-${i}` })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for Firebase Auth to initialize before fetching, to prevent permission errors
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchMappings();
      } else {
        // If not logged in, we can either clear mappings or load defaults
        setCategories([...DEFAULT_CATEGORIES]);
        setMappings(defaultMappings.map((m, i) => ({ ...m, id: `local-${i}` })));
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateMapping = async (id: string, newCategory: Category) => {
    try {
      if (id.startsWith('local-')) {
        // Can't update local fallback
        console.warn('Cannot update fallback local mappings');
        return;
      }
      const docRef = doc(db, 'storeMappings', id);
      await updateDoc(docRef, { category: newCategory });
      
      // Update local state
      setMappings(prev => prev.map(m => m.id === id ? { ...m, category: newCategory } : m));
    } catch (error) {
      console.error("Error updating mapping: ", error);
      throw error;
    }
  };

  const getCategoryForStore = (storeName: string): Category => {
    const mapping = mappings.find(m => m.storeName === storeName);
    return mapping ? mapping.category : '미분류';
  };

  const addCategory = async (name: string) => {
    if (!name || categories.includes(name)) return;
    const newCategories = [...categories, name];
    await updateDoc(doc(db, 'settings', 'hqCategories'), { categories: newCategories });
    setCategories(newCategories);
  };

  const deleteCategory = async (name: string) => {
    // 기본 카테고리는 삭제 방지 (선택적 구현)
    if (DEFAULT_CATEGORIES.includes(name)) {
      alert('기본 본부는 삭제할 수 없습니다.');
      return;
    }
    const newCategories = categories.filter(c => c !== name);
    await updateDoc(doc(db, 'settings', 'hqCategories'), { categories: newCategories });
    setCategories(newCategories);

    // 삭제된 본부에 속한 매장들을 '미분류'로 자동 폴백
    const affectedMappings = mappings.filter(m => m.category === name);
    for (const m of affectedMappings) {
      if (m.id && !m.id.startsWith('local-')) {
        await updateDoc(doc(db, 'storeMappings', m.id), { category: '미분류' });
      }
    }
    setMappings(prev => prev.map(m => m.category === name ? { ...m, category: '미분류' } : m));
  };

  return (
    <MappingContext.Provider value={{ mappings, categories, loading, updateMapping, getCategoryForStore, addCategory, deleteCategory }}>
      {children}
    </MappingContext.Provider>
  );
};

export const useMapping = () => {
  const context = useContext(MappingContext);
  if (!context) throw new Error('useMapping must be used within a MappingProvider');
  return context;
};
