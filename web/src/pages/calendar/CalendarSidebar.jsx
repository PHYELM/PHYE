import React from "react";
import CalendarMiniMonth from "./CalendarMiniMonth";

export default function CalendarSidebar({
  selectedDate,
  onDateChange,
  departments,
  deptFilterIds,
  onDeptFilterChange,
  isDirection,
}) {
  const toggleDept = (departmentId) => {
    if (deptFilterIds.includes(departmentId)) {
      onDeptFilterChange(deptFilterIds.filter((id) => id !== departmentId));
      return;
    }
    onDeptFilterChange([...deptFilterIds, departmentId]);
  };

  const toggleAll = () => {
    if (deptFilterIds.length > 0) {
      onDeptFilterChange([]);
      return;
    }
    onDeptFilterChange(departments.map((d) => d.id));
  };

  const allChecked =
    deptFilterIds.length === 0 || deptFilterIds.length === departments.length;

  return (
    <aside className="calSidebar">
      {/* Mini calendario */}
      <div className="calCard calSidebarSection calSidebarCalendarCard" style={{ flex: "0 0 auto" }}>
        <CalendarMiniMonth
          selectedDate={selectedDate}
          onDateChange={onDateChange}
        />
      </div>

      {/* Filtro de departamentos */}
      {isDirection && (
        <div className="calCard calSidebarSection" style={{ flex: "1 1 auto" }}>
          <div className="calFilterTitle">Mis calendarios</div>

          <div className="calDeptList">
            {/* Todos los departamentos */}
            <label className="calDeptItem" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                className="calDeptCheckbox"
                style={{ "--dept-color": "#1a73e8" }}
                checked={allChecked}
                onChange={toggleAll}
              />
              <span className="calDeptName">Todos los departamentos</span>
            </label>

            {/* Cada departamento con su color */}
            {departments.map((dept) => (
              <label className="calDeptItem" key={dept.id} style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  className="calDeptCheckbox"
                  style={{ "--dept-color": dept.color || "#1a73e8" }}
                  checked={deptFilterIds.includes(dept.id)}
                  onChange={() => toggleDept(dept.id)}
                />
                <span className="calDeptName">{dept.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}