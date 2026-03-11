import { useState, useMemo } from 'react';
import { useEditorStore } from '../store/editor-store';
import type { GuestStatus } from '../types';

type SortField = 'name' | 'status' | 'group' | 'dietary';

export function GuestsPage() {
  const layout = useEditorStore((s) => s.layout);
  const selectedGuestId = useEditorStore((s) => s.selectedGuestId);

  const addGuest = useEditorStore((s) => s.addGuest);
  const updateGuest = useEditorStore((s) => s.updateGuest);
  const deleteGuest = useEditorStore((s) => s.deleteGuest);
  const selectGuest = useEditorStore((s) => s.selectGuest);
  const assignGuestToTable = useEditorStore((s) => s.assignGuestToTable);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<GuestStatus | 'all'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGuestForm, setNewGuestForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'invited' as GuestStatus,
    group: 'friends' as const,
    dietary: 'none' as const,
  });

  // Filter and sort guests
  const filteredGuests = useMemo(() => {
    let filtered = layout.guests;

    if (searchText) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.name.toLowerCase().includes(lower) ||
          g.email.toLowerCase().includes(lower)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((g) => g.status === statusFilter);
    }

    if (groupFilter !== 'all') {
      filtered = filtered.filter((g) => g.group === groupFilter);
    }

    filtered.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal);
      }
      return 0;
    });

    return filtered;
  }, [layout.guests, searchText, statusFilter, groupFilter, sortBy]);

  const selectedGuest = layout.guests.find((g) => g.id === selectedGuestId);
  const confirmedCount = layout.guests.filter(
    (g) => g.status === 'confirmed'
  ).length;
  const declinedCount = layout.guests.filter(
    (g) => g.status === 'declined'
  ).length;
  const unseatedCount = layout.guests.filter((g) => !g.tableId).length;
  const plusOnesCount = layout.guests.filter((g) => g.plusOne).length;

  const handleAddGuest = () => {
    if (!newGuestForm.name.trim()) return;

    addGuest({
      ...newGuestForm,
      tableId: null,
      seatNumber: null,
      notes: '',
      plusOne: false,
      plusOneName: '',
      plusOneTableId: null,
      plusOneSeatNumber: null,
    });

    setNewGuestForm({
      name: '',
      email: '',
      phone: '',
      status: 'invited',
      group: 'friends',
      dietary: 'none',
    });
    setShowAddForm(false);
  };

  const getStatusBadgeColor = (status: GuestStatus) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-900 text-green-300';
      case 'declined':
        return 'bg-red-900 text-red-300';
      case 'invited':
        return 'bg-yellow-900 text-yellow-300';
      case 'maybe':
        return 'bg-gray-700 text-gray-300';
    }
  };

  const tables = layout.shapes.filter(
    (s) => s.kind === 'round-table' || s.kind === 'rect-table'
  );

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-gray-950">
      {/* Summary bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex gap-6 text-xs text-gray-400">
        <div>
          <span className="font-semibold">Total:</span> {layout.guests.length}
        </div>
        <div>
          <span className="font-semibold text-green-400">Confirmed:</span>{' '}
          {confirmedCount}
        </div>
        <div>
          <span className="font-semibold text-red-400">Declined:</span>{' '}
          {declinedCount}
        </div>
        <div>
          <span className="font-semibold text-amber-400">Unseated:</span>{' '}
          {unseatedCount}
        </div>
        <div>
          <span className="font-semibold">Plus ones:</span> {plusOnesCount}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Guest list */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filter bar */}
          <div className="bg-gray-900 border-b border-gray-700 p-4 space-y-3">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500"
            />

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="flex-1 px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
              >
                <option value="all">All Statuses</option>
                <option value="invited">Invited</option>
                <option value="confirmed">Confirmed</option>
                <option value="declined">Declined</option>
                <option value="maybe">Maybe</option>
              </select>

              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="flex-1 px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
              >
                <option value="all">All Groups</option>
                <option value="bride">Bride</option>
                <option value="groom">Groom</option>
                <option value="family">Family</option>
                <option value="friends">Friends</option>
                <option value="colleagues">Colleagues</option>
                <option value="other">Other</option>
              </select>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3 py-1 bg-rose-600 text-white rounded text-sm font-medium hover:bg-rose-700"
              >
                + Add Guest
              </button>
            </div>

            {/* Add guest form */}
            {showAddForm && (
              <div className="bg-gray-800 border border-gray-700 rounded p-3 space-y-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={newGuestForm.name}
                  onChange={(e) =>
                    setNewGuestForm({ ...newGuestForm, name: e.target.value })
                  }
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                />
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Email"
                    value={newGuestForm.email}
                    onChange={(e) =>
                      setNewGuestForm({ ...newGuestForm, email: e.target.value })
                    }
                    className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                  />
                  <select
                    value={newGuestForm.status}
                    onChange={(e) =>
                      setNewGuestForm({
                        ...newGuestForm,
                        status: e.target.value as GuestStatus,
                      })
                    }
                    className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                  >
                    <option value="invited">Invited</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="declined">Declined</option>
                    <option value="maybe">Maybe</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddGuest}
                    className="flex-1 px-2 py-1 bg-green-900 text-green-300 rounded text-sm font-medium hover:bg-green-800"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm font-medium hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Guest table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-800 border-b border-gray-700">
                <tr>
                  <th
                    className="px-4 py-2 text-left cursor-pointer hover:bg-gray-700"
                    onClick={() => setSortBy('name')}
                  >
                    Name {sortBy === 'name' && '↓'}
                  </th>
                  <th
                    className="px-4 py-2 text-left cursor-pointer hover:bg-gray-700"
                    onClick={() => setSortBy('status')}
                  >
                    Status {sortBy === 'status' && '↓'}
                  </th>
                  <th
                    className="px-4 py-2 text-left cursor-pointer hover:bg-gray-700"
                    onClick={() => setSortBy('group')}
                  >
                    Group {sortBy === 'group' && '↓'}
                  </th>
                  <th className="px-4 py-2 text-left">Dietary</th>
                  <th className="px-4 py-2 text-left">Table</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map((guest) => (
                  <tr
                    key={guest.id}
                    onClick={() => selectGuest(guest.id)}
                    className={`border-b border-gray-800 cursor-pointer transition-colors ${
                      !guest.tableId ? 'border-l-4 border-l-amber-500' : ''
                    } ${selectedGuestId === guest.id ? 'bg-gray-800' : 'hover:bg-gray-800/50'}`}
                  >
                    <td className="px-4 py-2 text-white">{guest.name}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeColor(guest.status)}`}
                      >
                        {guest.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-400 capitalize">
                      {guest.group}
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs capitalize">
                      {guest.dietary}
                    </td>
                    <td className="px-4 py-2 text-gray-400">
                      {guest.tableId
                        ? layout.shapes.find((s) => s.id === guest.tableId)
                            ?.label || '—'
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right panel: Guest detail */}
        {selectedGuest && (
          <div className="w-64 bg-gray-900 border-l border-gray-700 overflow-y-auto">
            <div className="p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-300">
                {selectedGuest.name}
              </h3>

              {/* All editable fields */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={selectedGuest.name}
                  onChange={(e) =>
                    updateGuest(selectedGuest.id, { name: e.target.value })
                  }
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={selectedGuest.email}
                  onChange={(e) =>
                    updateGuest(selectedGuest.id, { email: e.target.value })
                  }
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Phone</label>
                <input
                  type="tel"
                  value={selectedGuest.phone}
                  onChange={(e) =>
                    updateGuest(selectedGuest.id, { phone: e.target.value })
                  }
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Status</label>
                <select
                  value={selectedGuest.status}
                  onChange={(e) =>
                    updateGuest(selectedGuest.id, {
                      status: e.target.value as GuestStatus,
                    })
                  }
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                >
                  <option value="invited">Invited</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="declined">Declined</option>
                  <option value="maybe">Maybe</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Group</label>
                <select
                  value={selectedGuest.group}
                  onChange={(e) =>
                    updateGuest(selectedGuest.id, { group: e.target.value as any })
                  }
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                >
                  <option value="bride">Bride</option>
                  <option value="groom">Groom</option>
                  <option value="family">Family</option>
                  <option value="friends">Friends</option>
                  <option value="colleagues">Colleagues</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Dietary
                </label>
                <select
                  value={selectedGuest.dietary}
                  onChange={(e) =>
                    updateGuest(selectedGuest.id, { dietary: e.target.value as any })
                  }
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                >
                  <option value="none">None</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="gluten-free">Gluten Free</option>
                  <option value="halal">Halal</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <textarea
                  value={selectedGuest.notes}
                  onChange={(e) =>
                    updateGuest(selectedGuest.id, { notes: e.target.value })
                  }
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white resize-none"
                  rows={3}
                />
              </div>

              <div className="h-px bg-gray-700" />

              {/* Table assignment */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Table Assignment
                </label>
                <select
                  value={selectedGuest.tableId || ''}
                  onChange={(e) =>
                    assignGuestToTable(
                      selectedGuest.id,
                      e.target.value || null,
                      null
                    )
                  }
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                >
                  <option value="">Unassigned</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedGuest.tableId && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Seat Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={selectedGuest.seatNumber || ''}
                    onChange={(e) =>
                      updateGuest(selectedGuest.id, {
                        seatNumber: parseInt(e.target.value) || null,
                      })
                    }
                    className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                  />
                </div>
              )}

              <div className="h-px bg-gray-700" />

              {/* Plus one */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="plusOne"
                  checked={selectedGuest.plusOne}
                  onChange={(e) =>
                    updateGuest(selectedGuest.id, { plusOne: e.target.checked })
                  }
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="plusOne" className="text-sm text-gray-400">
                  Has Plus One
                </label>
              </div>

              {selectedGuest.plusOne && (
                <>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Plus One Name
                    </label>
                    <input
                      type="text"
                      value={selectedGuest.plusOneName}
                      onChange={(e) =>
                        updateGuest(selectedGuest.id, {
                          plusOneName: e.target.value,
                        })
                      }
                      className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Plus One Table
                    </label>
                    <select
                      value={selectedGuest.plusOneTableId || ''}
                      onChange={(e) =>
                        updateGuest(selectedGuest.id, {
                          plusOneTableId: e.target.value || null,
                        })
                      }
                      className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                    >
                      <option value="">Unassigned</option>
                      {tables.map((table) => (
                        <option key={table.id} value={table.id}>
                          {table.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="h-px bg-gray-700" />

              <button
                onClick={() => {
                  deleteGuest(selectedGuest.id);
                  selectGuest(null);
                }}
                className="w-full h-8 bg-red-900 text-red-300 hover:bg-red-800 rounded text-sm font-medium transition-colors"
              >
                Delete Guest
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
