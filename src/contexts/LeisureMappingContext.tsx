import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export interface LeisureGroup {
  id?: string;
  name: string;
  facilities: string[]; // List of depth2 or facility_names mapped to this group
}

interface LeisureMappingContextType {
  leisureGroups: LeisureGroup[];
  loading: boolean;
  addGroup: (name: string, facilities: string[]) => Promise<void>;
  updateGroup: (id: string, name: string, facilities: string[]) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
}

const LeisureMappingContext = createContext<LeisureMappingContextType | undefined>(undefined);

const DEFAULT_GROUPS: LeisureGroup[] = [
  { name: '목장', facilities: ['목장'] },
  { name: '미디어아트센터', facilities: ['미디어아트센터'] },
  { name: '썸머랜드', facilities: ['썸머랜드'] },
  { name: '원더풀', facilities: ['원더풀'] },
  { name: '사계절썰매', facilities: ['사계절썰매'] },
  { name: '마리나클럽', facilities: ['마리나클럽'] },
  { name: '미니포렛', facilities: ['미니포렛'] },
  { name: '그랜드포렛', facilities: ['그랜드포렛'] },
  { name: '놀이동산', facilities: ['놀이동산'] },
  { name: '모토아레나', facilities: ['모토아레나'] },
  { name: '기타티켓', facilities: ['기타티켓', '기타티켓(패키지)'] },
  { name: '온라인티켓', facilities: ['온라인티켓', '온라인티켓-기타'] }
];

export const LeisureMappingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [leisureGroups, setLeisureGroups] = useState<LeisureGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    try {
      const mappingRef = collection(db, 'leisureMappings');
      const snapshot = await getDocs(mappingRef);

      if (snapshot.empty) {
        // Initialize default mappings if empty
        const newGroups: LeisureGroup[] = [];
        for (const defaultGroup of DEFAULT_GROUPS) {
          const newDocRef = doc(mappingRef);
          const newGroup = { ...defaultGroup, id: newDocRef.id };
          await setDoc(newDocRef, { name: newGroup.name, facilities: newGroup.facilities });
          newGroups.push(newGroup);
        }
        setLeisureGroups(newGroups);
      } else {
        const fetchedGroups: LeisureGroup[] = [];
        snapshot.docs.forEach(docSnapshot => {
          const data = docSnapshot.data() as Omit<LeisureGroup, 'id'>;
          fetchedGroups.push({ id: docSnapshot.id, ...data });
        });

        // Ensure new DEFAULT_GROUPS are injected if missing
        const missingGroups = DEFAULT_GROUPS.filter(
          dg => !fetchedGroups.some(fg => fg.name === dg.name)
        );

        for (const missing of missingGroups) {
          const newDocRef = doc(mappingRef);
          const newGroup = { ...missing, id: newDocRef.id };
          await setDoc(newDocRef, { name: newGroup.name, facilities: newGroup.facilities });
          fetchedGroups.push(newGroup);
        }

        setLeisureGroups(fetchedGroups);
      }
    } catch (error) {
      console.error("Error fetching leisure mappings: ", error);
      // Fallback
      setLeisureGroups(DEFAULT_GROUPS.map((g, i) => ({ ...g, id: `local-${i}` })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchGroups();
      } else {
        setLeisureGroups(DEFAULT_GROUPS.map((g, i) => ({ ...g, id: `local-${i}` })));
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const addGroup = async (name: string, facilities: string[]) => {
    try {
      const mappingRef = collection(db, 'leisureMappings');
      const newDocRef = doc(mappingRef);
      await setDoc(newDocRef, { name, facilities });
      setLeisureGroups(prev => [...prev, { id: newDocRef.id, name, facilities }]);
    } catch (error) {
      console.error("Error adding leisure group: ", error);
      throw error;
    }
  };

  const updateGroup = async (id: string, name: string, facilities: string[]) => {
    if (id.startsWith('local-')) return;
    try {
      const docRef = doc(db, 'leisureMappings', id);
      await updateDoc(docRef, { name, facilities });
      setLeisureGroups(prev => prev.map(g => g.id === id ? { ...g, name, facilities } : g));
    } catch (error) {
      console.error("Error updating leisure group: ", error);
      throw error;
    }
  };

  const deleteGroup = async (id: string) => {
    if (id.startsWith('local-')) return;
    try {
      const docRef = doc(db, 'leisureMappings', id);
      await deleteDoc(docRef);
      setLeisureGroups(prev => prev.filter(g => g.id !== id));
    } catch (error) {
      console.error("Error deleting leisure group: ", error);
      throw error;
    }
  };

  return (
    <LeisureMappingContext.Provider value={{ leisureGroups, loading, addGroup, updateGroup, deleteGroup }}>
      {children}
    </LeisureMappingContext.Provider>
  );
};

export const useLeisureMapping = () => {
  const context = useContext(LeisureMappingContext);
  if (context === undefined) {
    throw new Error('useLeisureMapping must be used within a LeisureMappingProvider');
  }
  return context;
};
