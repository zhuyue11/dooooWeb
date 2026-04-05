/**
 * TimeZonePicker — popover for selecting IANA timezone.
 *
 * Adapted from dooooApp's GlassTimeZonePicker.
 * Device timezone pinned at top, searchable list sorted by UTC offset.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from 'react-i18next';

// ── Timezone data ──

interface TimeZoneItem {
  id: string;
  displayName: string;
  utcOffset: string;
  offsetMinutes: number;
  searchText: string;
}

function getOffsetMinutes(tz: string, now: Date): number {
  const str = now.toLocaleString('en-US', { timeZone: tz });
  const local = new Date(str);
  return Math.round((local.getTime() - now.getTime()) / 60000);
}

function getAllTimeZones(locale: string): TimeZoneItem[] {
  const now = new Date();
  const seen = new Map<string, TimeZoneItem>();

  // Intl.supportedValuesOf available in modern browsers
  const zones = typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
    ? (Intl as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf('timeZone')
    : [];

  for (const tz of zones) {
    try {
      const parts = new Intl.DateTimeFormat(locale, { timeZone: tz, timeZoneName: 'long' }).formatToParts(now);
      const displayName = parts.find(p => p.type === 'timeZoneName')?.value || tz;
      if (seen.has(displayName)) continue;

      const offsetMinutes = getOffsetMinutes(tz, now);
      const sign = offsetMinutes >= 0 ? '+' : '-';
      const absMin = Math.abs(offsetMinutes);
      const h = String(Math.floor(absMin / 60)).padStart(2, '0');
      const m = String(absMin % 60).padStart(2, '0');
      const utcOffset = `GMT${sign}${h}:${m}`;

      const searchText = `${displayName} ${tz.replace(/[/_]/g, ' ')} ${utcOffset}`.toLowerCase();
      seen.set(displayName, { id: tz, displayName, utcOffset, offsetMinutes, searchText });
    } catch { /* skip */ }
  }

  return Array.from(seen.values()).sort((a, b) => a.offsetMinutes - b.offsetMinutes);
}

// ── Component ──

interface TimeZonePickerProps {
  selectedTimeZone: string;
  onSelect: (tz: string) => void;
  onClose: () => void;
}

export function TimeZonePicker({ selectedTimeZone, onSelect, onClose }: TimeZonePickerProps) {
  const { i18n } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const deviceTimeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const allTimeZones = useMemo(() => getAllTimeZones(i18n.language), [i18n.language]);

  const deviceTzItem = useMemo(
    () => allTimeZones.find(tz => tz.id === deviceTimeZone) || null,
    [allTimeZones, deviceTimeZone],
  );

  const filteredTimeZones = useMemo(() => {
    let list = allTimeZones;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(tz => tz.searchText.includes(query));
    } else if (deviceTzItem) {
      list = list.filter(tz => tz.id !== deviceTzItem.id);
    }
    return list;
  }, [allTimeZones, searchQuery, deviceTzItem]);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Focus search on open
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const handleSelect = (tz: string) => {
    onSelect(tz);
    onClose();
  };

  const renderRow = (item: TimeZoneItem) => {
    const isSelected = item.id === selectedTimeZone;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleSelect(item.id)}
        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50 ${
          isSelected ? 'bg-primary/5' : ''
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className={`text-sm ${isSelected ? 'font-semibold text-primary' : 'font-medium text-foreground'}`}>
            {item.displayName}
          </div>
          <div className="text-xs text-muted-foreground">{item.utcOffset} · {item.id}</div>
        </div>
        {isSelected && <Icon name="check" size={18} color="var(--color-primary)" />}
      </button>
    );
  };

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 mt-1 w-[340px] rounded-xl border border-border bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
    >
      {/* Search */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5">
          <Icon name="search" size={16} color="var(--color-muted-foreground)" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search timezones..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-h-[300px] overflow-y-auto">
        {/* Device timezone pinned at top */}
        {deviceTzItem && !searchQuery.trim() && (
          <>
            <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Device
            </div>
            {renderRow(deviceTzItem)}
            <div className="mx-4 border-t border-border" />
          </>
        )}

        {/* All timezones */}
        {filteredTimeZones.map(renderRow)}

        {filteredTimeZones.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">No timezones found</div>
        )}
      </div>
    </div>
  );
}
