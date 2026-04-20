'use client';

import { useState } from 'react';

export type UserStat = {
  userId: string;
  navn: string;
  genereringer: number;
  kopier_total: number;
  kopier_arsak: number;
  kopier_risiko: number;
  kopier_konsekvens: number;
  kopier_tiltak: number;
  siste_bruk: string;
};

type SortKey = 'navn' | 'genereringer' | 'kopier_total' | 'siste_bruk';

interface Props {
  brukere: UserStat[];
}

export default function ArkatBrukTabell({ brukere }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('siste_bruk');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...brukere].sort((a, b) => {
    let cmp: number;
    if (sortKey === 'navn') {
      cmp = a.navn.localeCompare(b.navn, 'nb');
    } else if (sortKey === 'siste_bruk') {
      cmp = new Date(a.siste_bruk).getTime() - new Date(b.siste_bruk).getTime();
    } else {
      cmp = a[sortKey] - b[sortKey];
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span className="ml-1 text-[#94a3b8]">
      {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  if (brukere.length === 0) {
    return (
      <div className="portal-card p-8 text-center">
        <p className="text-sm text-[#94a3b8]">Ingen brukere ennå.</p>
      </div>
    );
  }

  return (
    <div className="portal-card overflow-hidden">
      <div className="p-5 border-b border-[#e2e8f0]">
        <h2 className="text-sm font-semibold text-[#1e293b]">Per takstmann</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
              <th
                className="text-left px-4 py-3 text-xs font-medium text-[#64748b] cursor-pointer hover:text-[#285982] whitespace-nowrap"
                onClick={() => handleSort('navn')}
              >
                Navn <SortIcon k="navn" />
              </th>
              <th
                className="text-right px-4 py-3 text-xs font-medium text-[#64748b] cursor-pointer hover:text-[#285982] whitespace-nowrap"
                onClick={() => handleSort('genereringer')}
              >
                Genereringer <SortIcon k="genereringer" />
              </th>
              <th
                className="text-right px-4 py-3 text-xs font-medium text-[#64748b] cursor-pointer hover:text-[#285982] whitespace-nowrap"
                onClick={() => handleSort('kopier_total')}
              >
                Kopier totalt <SortIcon k="kopier_total" />
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[#64748b] whitespace-nowrap">
                Årsak
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[#64748b] whitespace-nowrap">
                Risiko
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[#64748b] whitespace-nowrap">
                Kons.
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[#64748b] whitespace-nowrap">
                Tiltak
              </th>
              <th
                className="text-right px-4 py-3 text-xs font-medium text-[#64748b] cursor-pointer hover:text-[#285982] whitespace-nowrap"
                onClick={() => handleSort('siste_bruk')}
              >
                Siste bruk <SortIcon k="siste_bruk" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {sorted.map((u) => {
              const dato = new Date(u.siste_bruk).toLocaleDateString('nb-NO', {
                day: 'numeric',
                month: 'short',
                year: '2-digit',
              });
              return (
                <tr key={u.userId} className="hover:bg-[#f8fafc]">
                  <td className="px-4 py-3 text-[#1e293b] font-medium">{u.navn}</td>
                  <td className="px-4 py-3 text-right text-[#1e293b]">{u.genereringer}</td>
                  <td className="px-4 py-3 text-right text-[#1e293b]">{u.kopier_total}</td>
                  <td className="px-4 py-3 text-right text-[#64748b]">
                    {u.kopier_arsak > 0 ? u.kopier_arsak : <span className="text-[#cbd5e1]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-[#64748b]">
                    {u.kopier_risiko > 0 ? u.kopier_risiko : <span className="text-[#cbd5e1]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-[#64748b]">
                    {u.kopier_konsekvens > 0 ? u.kopier_konsekvens : <span className="text-[#cbd5e1]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-[#64748b]">
                    {u.kopier_tiltak > 0 ? u.kopier_tiltak : <span className="text-[#cbd5e1]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-[#94a3b8]">{dato}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
