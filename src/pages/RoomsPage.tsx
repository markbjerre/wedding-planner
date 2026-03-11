import { useState } from 'react';
import { useEditorStore } from '../store/editor-store';
import type { RoomType } from '../types';

export function RoomsPage() {
  const layout = useEditorStore((s) => s.layout);
  const selectedRoomId = useEditorStore((s) => s.selectedRoomId);

  const addRoom = useEditorStore((s) => s.addRoom);
  const updateRoom = useEditorStore((s) => s.updateRoom);
  const deleteRoom = useEditorStore((s) => s.deleteRoom);
  const selectRoom = useEditorStore((s) => s.selectRoom);
  const assignGuestToRoom = useEditorStore((s) => s.assignGuestToRoom);

  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    name: '',
    type: 'bedroom' as RoomType,
    capacity: 2,
    floor: 1,
    building: 'Main',
    notes: '',
  });

  const selectedRoom = layout.rooms.find((r) => r.id === selectedRoomId);

  // Calculate stats
  const totalCapacity = layout.rooms.reduce((sum, r) => sum + r.capacity, 0);
  const guestsNeedingRooms = layout.guests.filter(
    (g) => !layout.rooms.some((r) => r.guestIds.includes(g.id))
  ).length;
  const assignedCount = layout.guests.filter((g) =>
    layout.rooms.some((r) => r.guestIds.includes(g.id))
  ).length;

  const unassignedGuests = layout.guests.filter(
    (g) => !layout.rooms.some((r) => r.guestIds.includes(g.id))
  );

  const handleAddRoom = () => {
    if (!newRoomForm.name.trim()) return;

    addRoom({
      ...newRoomForm,
      guestIds: [],
    });

    setNewRoomForm({
      name: '',
      type: 'bedroom',
      capacity: 2,
      floor: 1,
      building: 'Main',
      notes: '',
    });
    setShowAddRoom(false);
  };

  const getRoomFillColor = (room: typeof layout.rooms[0]) => {
    const fillPercent = room.guestIds.length / room.capacity;
    if (fillPercent === 0) return 'bg-green-900';
    if (fillPercent <= 0.75) return 'bg-amber-900';
    return 'bg-red-900';
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-gray-950">
      {/* Summary bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex gap-6 text-xs text-gray-400">
        <div>
          <span className="font-semibold">Rooms:</span> {layout.rooms.length}
        </div>
        <div>
          <span className="font-semibold">Capacity:</span> {totalCapacity}
        </div>
        <div>
          <span className="font-semibold">Assigned:</span> {assignedCount}
        </div>
        <div className="text-amber-400">
          <span className="font-semibold">Unassigned:</span> {guestsNeedingRooms}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Room cards grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-4 auto-rows-max">
            {layout.rooms.map((room) => {
              const fillPercent = (room.guestIds.length / room.capacity) * 100;
              return (
                <button
                  key={room.id}
                  onClick={() => selectRoom(room.id)}
                  className={`p-4 rounded border-2 text-left transition-all ${
                    selectedRoomId === room.id
                      ? 'border-rose-500 bg-gray-800'
                      : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        {room.name}
                      </h4>
                      <p className="text-xs text-gray-400 capitalize">
                        {room.type}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                      {room.floor}F
                    </span>
                  </div>

                  {/* Capacity bar */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-400">Occupancy</span>
                      <span className="text-xs font-mono text-gray-300">
                        {room.guestIds.length}/{room.capacity}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded overflow-hidden">
                      <div
                        className={`h-full transition-all ${getRoomFillColor(room)}`}
                        style={{ width: `${Math.min(fillPercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Guest chips */}
                  {room.guestIds.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {room.guestIds.map((guestId) => {
                        const guest = layout.guests.find((g) => g.id === guestId);
                        return guest ? (
                          <span
                            key={guestId}
                            className="inline-block px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs whitespace-nowrap"
                          >
                            {guest.name.split(' ')[0]}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Add room button */}
            {!showAddRoom && (
              <button
                onClick={() => setShowAddRoom(true)}
                className="p-4 rounded border-2 border-dashed border-gray-600 hover:border-gray-500 bg-gray-800/30 flex items-center justify-center min-h-32"
              >
                <span className="text-gray-400 text-sm font-medium">+ Add Room</span>
              </button>
            )}

            {/* Add room form */}
            {showAddRoom && (
              <div className="p-4 rounded border-2 border-rose-500 bg-gray-800 space-y-3">
                <input
                  type="text"
                  placeholder="Room name"
                  value={newRoomForm.name}
                  onChange={(e) =>
                    setNewRoomForm({ ...newRoomForm, name: e.target.value })
                  }
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                />

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newRoomForm.type}
                    onChange={(e) =>
                      setNewRoomForm({
                        ...newRoomForm,
                        type: e.target.value as RoomType,
                      })
                    }
                    className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                  >
                    <option value="bedroom">Bedroom</option>
                    <option value="suite">Suite</option>
                    <option value="dorm">Dorm</option>
                    <option value="bridal-suite">Bridal Suite</option>
                    <option value="other">Other</option>
                  </select>

                  <input
                    type="number"
                    min={1}
                    placeholder="Capacity"
                    value={newRoomForm.capacity}
                    onChange={(e) =>
                      setNewRoomForm({
                        ...newRoomForm,
                        capacity: parseInt(e.target.value) || 1,
                      })
                    }
                    className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={1}
                    placeholder="Floor"
                    value={newRoomForm.floor}
                    onChange={(e) =>
                      setNewRoomForm({
                        ...newRoomForm,
                        floor: parseInt(e.target.value) || 1,
                      })
                    }
                    className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                  />

                  <input
                    type="text"
                    placeholder="Building"
                    value={newRoomForm.building}
                    onChange={(e) =>
                      setNewRoomForm({
                        ...newRoomForm,
                        building: e.target.value,
                      })
                    }
                    className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAddRoom}
                    className="flex-1 px-2 py-1 bg-green-900 text-green-300 rounded text-sm font-medium hover:bg-green-800"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddRoom(false)}
                    className="flex-1 px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm font-medium hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Unassigned guests + selected room detail */}
        <div className="w-80 bg-gray-900 border-l border-gray-700 overflow-y-auto flex flex-col">
          {/* Unassigned guests pool */}
          <div className="border-b border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Unassigned Guests
            </h3>
            <div className="flex flex-wrap gap-2">
              {unassignedGuests.length === 0 ? (
                <p className="text-xs text-gray-500">All guests assigned</p>
              ) : (
                unassignedGuests.map((guest) => (
                  <button
                    key={guest.id}
                    onClick={() => {
                      if (selectedRoom) {
                        assignGuestToRoom(guest.id, selectedRoom.id);
                      }
                    }}
                    disabled={!selectedRoom}
                    className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 rounded transition-colors"
                  >
                    {guest.name.split(' ')[0]}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Selected room detail */}
          {selectedRoom && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">
                  {selectedRoom.name}
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={selectedRoom.name}
                      onChange={(e) =>
                        updateRoom(selectedRoom.id, { name: e.target.value })
                      }
                      className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Type
                      </label>
                      <select
                        value={selectedRoom.type}
                        onChange={(e) =>
                          updateRoom(selectedRoom.id, {
                            type: e.target.value as RoomType,
                          })
                        }
                        className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                      >
                        <option value="bedroom">Bedroom</option>
                        <option value="suite">Suite</option>
                        <option value="dorm">Dorm</option>
                        <option value="bridal-suite">Bridal Suite</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Capacity
                      </label>
                      <input
                        type="number"
                        value={selectedRoom.capacity}
                        onChange={(e) =>
                          updateRoom(selectedRoom.id, {
                            capacity: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Floor
                      </label>
                      <input
                        type="number"
                        value={selectedRoom.floor}
                        onChange={(e) =>
                          updateRoom(selectedRoom.id, {
                            floor: parseInt(e.target.value) || 1,
                          })
                        }
                        className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Building
                      </label>
                      <input
                        type="text"
                        value={selectedRoom.building}
                        onChange={(e) =>
                          updateRoom(selectedRoom.id, {
                            building: e.target.value,
                          })
                        }
                        className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={selectedRoom.notes}
                      onChange={(e) =>
                        updateRoom(selectedRoom.id, { notes: e.target.value })
                      }
                      className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white resize-none"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="h-px bg-gray-700 my-4" />

                {/* Assigned guests */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 mb-2">
                    Guests
                  </h4>
                  <div className="space-y-1">
                    {selectedRoom.guestIds.length === 0 ? (
                      <p className="text-xs text-gray-500">No guests assigned</p>
                    ) : (
                      selectedRoom.guestIds.map((guestId) => {
                        const guest = layout.guests.find((g) => g.id === guestId);
                        return guest ? (
                          <div
                            key={guestId}
                            className="flex items-center justify-between px-2 py-1 bg-gray-800 rounded"
                          >
                            <span className="text-sm text-gray-300">
                              {guest.name}
                            </span>
                            <button
                              onClick={() =>
                                assignGuestToRoom(guestId, null)
                              }
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              ✕
                            </button>
                          </div>
                        ) : null;
                      })
                    )}
                  </div>
                </div>

                <div className="h-px bg-gray-700 my-4" />

                <button
                  onClick={() => {
                    deleteRoom(selectedRoom.id);
                    selectRoom(null);
                  }}
                  className="w-full h-8 bg-red-900 text-red-300 hover:bg-red-800 rounded text-sm font-medium transition-colors"
                >
                  Delete Room
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
