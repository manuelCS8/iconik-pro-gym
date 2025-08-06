import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserRoutine, UserRoutineExercise } from '../redux/slices/userRoutinesSlice';

export interface CreateUserRoutineData {
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  exercises: UserRoutineExercise[];
  isPublic: boolean;
}

class UserRoutineService {
  // Crear rutina de usuario
  async createUserRoutine(userId: string, routineData: CreateUserRoutineData): Promise<string> {
    try {
      console.log('➕ Creando rutina para usuario:', userId);
      console.log('📝 Datos de rutina:', routineData);
      
      const routineRef = await addDoc(collection(db, 'userRoutines'), {
        ...routineData,
        createdBy: userId,
        createdAt: serverTimestamp(),
        isActive: true,
      });

      console.log('✅ Rutina creada con ID:', routineRef.id);
      return routineRef.id;
    } catch (error: any) {
      console.error('❌ Error creando rutina de usuario:', error);
      throw error;
    }
  }

  // Obtener rutinas del usuario
  async getUserRoutines(userId: string): Promise<UserRoutine[]> {
    try {
      console.log('🔍 Buscando rutinas para usuario:', userId);
      const routinesRef = collection(db, 'userRoutines');
      
      // Consulta simplificada sin orderBy para evitar necesidad de índice compuesto
      const q = query(
        routinesRef, 
        where('createdBy', '==', userId),
        where('isActive', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      console.log('📊 Documentos encontrados:', querySnapshot.docs.length);
      
      const routines = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📄 Datos de rutina:', doc.id, data);
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as UserRoutine;
      });
      
      // Ordenar en el cliente en lugar de en la consulta
      routines.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime(); // Más recientes primero
      });
      
      // Convertir fechas a strings ISO para Redux
      const serializedRoutines = routines.map(routine => ({
        ...routine,
        createdAt: routine.createdAt instanceof Date 
          ? routine.createdAt.toISOString() 
          : typeof routine.createdAt === 'string' 
            ? routine.createdAt 
            : new Date(routine.createdAt).toISOString()
      }));
      
      console.log('✅ Rutinas procesadas y ordenadas:', serializedRoutines.length);
      return serializedRoutines;
    } catch (error: any) {
      console.error('❌ Error obteniendo rutinas del usuario:', error);
      throw error;
    }
  }

  // Obtener rutina por ID
  async getUserRoutineById(id: string): Promise<UserRoutine | null> {
    try {
      const routineRef = doc(db, 'userRoutines', id);
      const routineSnap = await getDoc(routineRef);
      
      if (routineSnap.exists()) {
        const data = routineSnap.data();
        const routine = {
          id: routineSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as UserRoutine;
        
        // Convertir fecha a string ISO para Redux
        return {
          ...routine,
          createdAt: routine.createdAt instanceof Date 
            ? routine.createdAt.toISOString() 
            : typeof routine.createdAt === 'string' 
              ? routine.createdAt 
              : new Date(routine.createdAt).toISOString()
        };
      }
      
      return null;
    } catch (error: any) {
      console.error('Error obteniendo rutina por ID:', error);
      throw error;
    }
  }

  // Actualizar rutina
  async updateUserRoutine(id: string, updates: Partial<UserRoutine>): Promise<void> {
    try {
      const routineRef = doc(db, 'userRoutines', id);
      await updateDoc(routineRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Error actualizando rutina:', error);
      throw error;
    }
  }

  // Eliminar rutina (marcar como inactiva)
  async deleteUserRoutine(id: string): Promise<void> {
    try {
      const routineRef = doc(db, 'userRoutines', id);
      await updateDoc(routineRef, {
        isActive: false,
        deletedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Error eliminando rutina:', error);
      throw error;
    }
  }

  // Agregar ejercicio a rutina
  async addExerciseToRoutine(routineId: string, exercise: UserRoutineExercise): Promise<void> {
    try {
      const routineRef = doc(db, 'userRoutines', routineId);
      const routineSnap = await getDoc(routineRef);
      
      if (routineSnap.exists()) {
        const data = routineSnap.data();
        const exercises = data.exercises || [];
        exercises.push(exercise);
        
        await updateDoc(routineRef, {
          exercises,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error: any) {
      console.error('Error agregando ejercicio a rutina:', error);
      throw error;
    }
  }

  // Remover ejercicio de rutina
  async removeExerciseFromRoutine(routineId: string, exerciseIndex: number): Promise<void> {
    try {
      const routineRef = doc(db, 'userRoutines', routineId);
      const routineSnap = await getDoc(routineRef);
      
      if (routineSnap.exists()) {
        const data = routineSnap.data();
        const exercises = data.exercises || [];
        exercises.splice(exerciseIndex, 1);
        
        await updateDoc(routineRef, {
          exercises,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error: any) {
      console.error('Error removiendo ejercicio de rutina:', error);
      throw error;
    }
  }

  // Actualizar ejercicio en rutina
  async updateExerciseInRoutine(routineId: string, exerciseIndex: number, exercise: UserRoutineExercise): Promise<void> {
    try {
      const routineRef = doc(db, 'userRoutines', routineId);
      const routineSnap = await getDoc(routineRef);
      
      if (routineSnap.exists()) {
        const data = routineSnap.data();
        const exercises = data.exercises || [];
        exercises[exerciseIndex] = exercise;
        
        await updateDoc(routineRef, {
          exercises,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error: any) {
      console.error('Error actualizando ejercicio en rutina:', error);
      throw error;
    }
  }

  // Obtener categorías de rutinas
  async getUserRoutineCategories(): Promise<string[]> {
    try {
      const routinesRef = collection(db, 'userRoutines');
      const q = query(routinesRef, where('isActive', '==', true));
      const querySnapshot = await getDocs(q);
      
      const categories = new Set<string>();
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.category) {
          categories.add(data.category);
        }
      });
      
      return Array.from(categories).sort();
    } catch (error: any) {
      console.error('Error obteniendo categorías de rutinas:', error);
      throw error;
    }
  }

  // Obtener rutinas por categoría
  async getUserRoutinesByCategory(userId: string, category: string): Promise<UserRoutine[]> {
    try {
      const routinesRef = collection(db, 'userRoutines');
      const q = query(
        routinesRef, 
        where('createdBy', '==', userId),
        where('category', '==', category),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as UserRoutine;
      });
    } catch (error: any) {
      console.error('Error obteniendo rutinas por categoría:', error);
      throw error;
    }
  }

  // Obtener rutinas por dificultad
  async getUserRoutinesByDifficulty(userId: string, difficulty: string): Promise<UserRoutine[]> {
    try {
      const routinesRef = collection(db, 'userRoutines');
      const q = query(
        routinesRef, 
        where('createdBy', '==', userId),
        where('difficulty', '==', difficulty),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as UserRoutine;
      });
    } catch (error: any) {
      console.error('Error obteniendo rutinas por dificultad:', error);
      throw error;
    }
  }
}

export default new UserRoutineService(); 