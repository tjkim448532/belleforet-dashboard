import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
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
        snapshot.forEach((doc) => {
          fetchedMappings.push({ id: doc.id, ...(doc.data() as Omit<StoreMapping, 'id'>) });
        });
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
    fetchMappings();
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
