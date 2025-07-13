import { useState, useCallback, useEffect } from 'react';
import type { MaterialScheduleItem, LabourScheduleItem, EquipmentScheduleItem } from '../types/scheduleTypes';

export const useSchedules = (projectId: string, refreshTrigger?: number) => {
  const [materials, setMaterials] = useState<MaterialScheduleItem[]>([]);
  const [labour, setLabour] = useState<LabourScheduleItem[]>([]);
  const [equipment, setEquipment] = useState<EquipmentScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/estimates/schedules/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }

      const result = await response.json();
      if (result.success) {
        setMaterials(result.data.materials || []);
        setLabour(result.data.labour || []);
        setEquipment(result.data.equipment || []);
      } else {
        throw new Error(result.error || 'Failed to fetch schedules');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch schedules';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const exportSchedule = useCallback(async (
    format: 'csv' | 'excel' | 'pdf',
    type: 'material' | 'labour' | 'equipment'
  ): Promise<Blob> => {
    try {
      const response = await fetch(
        `/api/estimates/schedules/${projectId}/export?format=${format}&type=${type}`
      );
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      return await response.blob();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
      throw err;
    }
  }, [projectId]);

  const getScheduleSummary = useCallback(() => {
    return {
      materials: {
        totalItems: materials.length,
        totalCost: materials.reduce((sum, item) => sum + item.totalCost, 0)
      },
      labour: {
        totalItems: labour.length,
        totalHours: labour.reduce((sum, item) => sum + item.totalManHours, 0),
        totalCost: labour.reduce((sum, item) => sum + item.totalCost, 0)
      },
      equipment: {
        totalItems: equipment.length,
        totalHours: equipment.reduce((sum, item) => sum + item.totalHours, 0),
        totalCost: equipment.reduce((sum, item) => sum + item.totalCost, 0)
      }
    };
  }, [materials, labour, equipment]);

  // Auto-refresh when trigger changes
  useEffect(() => {
    if (projectId) {
      fetchSchedules();
    }
  }, [projectId, refreshTrigger, fetchSchedules]);

  return {
    materials,
    labour,
    equipment,
    isLoading,
    error,
    fetchSchedules,
    exportSchedule,
    getScheduleSummary
  };
};