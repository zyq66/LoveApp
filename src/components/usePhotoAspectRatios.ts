import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { Photo } from '../services/album';

export function usePhotoAspectRatios(photos: Photo[]) {
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const signature = photos.map(p => `${p.id}:${p.url}`).join('|');

  useEffect(() => {
    let cancelled = false;

    photos.forEach(photo => {
      setRatios(prev => {
        if (prev[photo.id]) return prev;
        Image.getSize(
          photo.url,
          (width, height) => {
            if (cancelled || width <= 0 || height <= 0) return;
            setRatios(current => (
              current[photo.id] ? current : { ...current, [photo.id]: width / height }
            ));
          },
          () => {
            if (cancelled) return;
            setRatios(current => (
              current[photo.id] ? current : { ...current, [photo.id]: 1 }
            ));
          },
        );
        return prev;
      });
    });

    return () => { cancelled = true; };
  }, [signature]);

  return ratios;
}
