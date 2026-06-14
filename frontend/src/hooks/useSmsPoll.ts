/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../api/client';

const BEEP_DATA_URI = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczIS5wr9/TpVMxHihlq9jXqFo3IiZho9LYqmA+JysmoNDcp2VDKCwln87fqGpJKi8jm8vhq29OKjQilcjjrXFTLDkgjMPhsHRZMEAkhr3mtntkPz80gLnouX9wSz5EgLHpvYF3WElKg7Dqv4J/YlBTiLLrwYiCa1xWk7jqxIyIdGJdm7vryZGNbmBcn77ujlqUFVeli7zwYGCfWRlZJe88WJkYWZtcH60/H13dXV0dnR5fH57eXZ0d3l8fn17eHZ1eHp9f316eHd3eXt+fn16eHd3eXt9fn58enh4eXt9fn58enh4eXt9fn58end4eXt9fn58end4';

type PollResult = {
  status: 'WAITING' | 'RECEIVED' | 'EXPIRED' | 'FAILED';
  smsCode: string | null;
  isPolling: boolean;
  phoneNumber: string | null;
};

export function useSmsPoll(logId: string | null, enabled: boolean): PollResult {
  const [status, setStatus] = useState<PollResult['status']>('WAITING');
  const [smsCode, setSmsCode] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (!logId || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    setStatus('WAITING');
    setSmsCode(null);

    const poll = async () => {
      try {
        const { data } = await api.get(`/sms/check/${logId}`);
        const log = data.smsLog || data;
        setPhoneNumber(log.phoneNumber || null);
        setStatus(log.status);
        if (log.status === 'RECEIVED' && log.smsCode) {
          setSmsCode(log.smsCode);
          stopPolling();
          try {
            await new Audio(BEEP_DATA_URI).play();
          } catch {
            return;
          }
        } else if (log.status === 'EXPIRED' || log.status === 'FAILED') {
          stopPolling();
        }
      } catch {
        return;
      }
    };

    void poll();
    intervalRef.current = setInterval(() => {
      void poll();
    }, 5000);

    return () => stopPolling();
  }, [enabled, logId, stopPolling]);

  return { status, smsCode, isPolling, phoneNumber };
}