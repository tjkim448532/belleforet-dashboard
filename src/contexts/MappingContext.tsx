import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { defaultMappings } from '../lib/defaultMappings';
import type { StoreMapping, Category } from '../lib/defaultMappings';

interface MappingContextType {
  mappings: StoreMapping[];
  loading: boolean;
  updateMapping: (id: string, newCategory: Category) => Promise<void>;
  getCategoryForStore: (storeName: string) => Category;
}

const MappingContext = createContext<MappingContextType | undefined>(undefined);

export const MappingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mappings, setMappings] = useState<StoreMapping[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMappings = async () => {
    try {
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
        setMappings(fetchedMappings);
      }
    } catch (error) {
      console.error("Error fetching mappings: ", error);
      // Fallback to local default mappings if firebase fails (e.g. offline)
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
        // For now, if they are viewing the public simulator, maybe they need defaults
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

  return (
    <MappingContext.Provider value={{ mappings, loading, updateMapping, getCategoryForStore }}>
      {children}
    </MappingContext.Provider>
  );
};

export const useMapping = () => {
  const context = useContext(MappingContext);
  if (!context) throw new Error('useMapping must be used within a MappingProvider');
  return context;
};
