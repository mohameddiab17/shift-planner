import React, { useState } from "react";
import { MapPin, Phone, Mail, Search, Funnel } from "lucide-react";

const Employees = () => {
  const [open, setOpen] = useState(false);
  const [empolyees, setEmpolyees] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
  });
  const [ourEmpolyees, setourEmpolyees] = useState([]);
  const handleChange = (e) => {
    setEmpolyees({ ...empolyees, [e.target.name]: e.target.value });
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    setourEmpolyees([...ourEmpolyees, empolyees]);
    setEmpolyees({
      name: "",
      email: "",
      phone: "",
      role: "",
    });
    setOpen(false);
  };
  return (
    <>
      <div className="flex justify-around items-start mb-4 gap-5 mt-5">
        <div>
          <h1 className="text-3xl font-semibold text-gray-800 ">
            Employee Management
          </h1>
          <p className="text-gray-600 mb-6">
            Manage your team members and their information
          </p>
        </div>

        <div className="flex items-end gap-2">
          <button
            className="px-8 py-2 rounded-md bg-[#3e78b1] text-white flex items-center cursor-pointer gap-1 shadow-sm"
            onClick={(e) => setOpen(true)}
          >
            + Add Employee
          </button>
          {/* el modal */}
          {open && (
            <div className="fixed inset-0  bg-opacity-25 flex items-center justify-center z-50">
              <div className="fixed inset-0  bg-black bg-opacity-25 flex items-center justify-center">
                <div className="bg-white rounded-xl p-6 w-[450px] shadow-lg relative">
                  <button
                    onClick={() => setOpen(false)}
                    className="absolute top-3 right-3 text-gray-600 hover:text-gray-800"
                  >
                    ✕
                  </button>
                  <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-5">
                      <h1 className="text-xl font-semibold text-gray-800">
                        Add New Employee
                      </h1>
                      {/* Full name */}
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium text-[#112D4E]"
                        >
                          Full Name
                        </label>
                        <input
                          value={empolyees.name}
                          onChange={handleChange}
                          id="name"
                          name="name"
                          type="name"
                          required
                          className="mt-1 block w-full px-3 py-2 border border-[#DBE2EF] rounded-md bg-[#F9F7F7] text-[#112D4E] placeholder-gray-400 focus:outline-none focus:ring-[#3F72AF] focus:border-[#3F72AF] sm:text-sm"
                          placeholder="Enter your email"
                        />
                      </div>
                      {/* Email */}
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium text-[#112D4E]"
                        >
                          Email
                        </label>
                        <input
                          onChange={handleChange}
                          value={empolyees.email}
                          id="email"
                          name="email"
                          type="email"
                          required
                          className="mt-1 block w-full px-3 py-2 border border-[#DBE2EF] rounded-md bg-[#F9F7F7] text-[#112D4E] placeholder-gray-400 focus:outline-none focus:ring-[#3F72AF] focus:border-[#3F72AF] sm:text-sm"
                          placeholder="Enter your email"
                        />
                      </div>

                      {/* Role */}
                      <div>
                        <label
                          htmlFor="role"
                          className="block text-sm font-medium text-[#112D4E]"
                        >
                          Role
                        </label>

                        <select
                          onChange={handleChange}
                          value={empolyees.role}
                          id="role"
                          name="role"
                          required
                          className="mt-1 block w-full px-3 py-2 border border-[#DBE2EF] rounded-md bg-[#F9F7F7] text-[#112D4E] focus:outline-none focus:ring-[#3F72AF] focus:border-[#3F72AF] sm:text-sm"
                        >
                          <option value="">Select Role</option>
                          <option value="Manager">Manager </option>
                          <option value="Server">Server</option>
                          <option value="Cashier">Cashier </option>
                          <option value="KitchenStaff">Kitchen Staff </option>
                        </select>
                      </div>
                      <div>
                        {/* Phone Number */}
                        <label
                          htmlFor="phone"
                          className="block text-sm font-medium text-[#112D4E]"
                        >
                          phone
                        </label>
                        <input
                          onChange={handleChange}
                          value={empolyees.phone}
                          id="phone"
                          name="phone"
                          type="phone"
                          required
                          className="mt-1 block w-full px-3 py-2 border border-[#DBE2EF] rounded-md bg-[#F9F7F7] text-[#112D4E] placeholder-gray-400 focus:outline-none focus:ring-[#3F72AF] focus:border-[#3F72AF] sm:text-sm"
                          placeholder="(552)941 942 0413 "
                        />
                      </div>
                    </div>

                    {/* Error Message */}

                    {/* Login Button */}
                    <div>
                      <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-[#19283a] hover:bg-[#274b74] transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3F72AF] disabled:opacity-50"
                      >
                        {" "}
                        Add Empolyee
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mx-4 ">
        <div className="card w-80 h-25">
          <div className="flex items-center ">
            <div className="text-right">
              <p className="text-gray-700 text-left text-2xl mb-1 font-bold">
                {" "}
                24
              </p>
              <p className="font-semibold text-gray-800 text-left">
                Total Employees
              </p>
            </div>
          </div>
        </div>
        <div className="card w-80 h-25 hover:bg-gray-50">
          <div className="flex items-center">
            <div className="text-right">
              <p className="text-left text-2xl mb-1 text-green-500 font-bold">
                {" "}
                22
              </p>
              <p className="font-semibold text-gray-800 text-left">active</p>
            </div>
          </div>
        </div>
        <div className="card w-80 h-25">
          <div className="flex items-center">
            <div className="text-right">
              <p className=" text-left text-2xl mb-1 text-amber-300 font-bold">
                {" "}
                1
              </p>
              <p className="font-semibold text-gray-800 text-left">Pending</p>
            </div>
          </div>
        </div>
        <div className="card w-80 h-25">
          <div className="flex items-center">
            <div className="text-right">
              <p className="text-gray-700 text-left text-2xl mb-1 font-bold">
                {" "}
                1
              </p>
              <p className="font-semibold text-gray-800 text-left">inactive</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-gray-50 min-h-screen">
        <div className=" mx-auto bg-white rounded-xl shadow-sm p-6 ">
          {/* Title + Search */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              Employee List
            </h2>

            <div className="flex items-center gap-3">
              <div className="flex items-center  border-gray-300 border rounded-lg px-3 py-2 w-84 bg-gray-100">
                <Search className="w-4" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  className="ml-2 outline-none text-sm w-full"
                />
              </div>
              <select className="w-25 px-3 py-1 rounded-md border-gray-300  text-gray-700 bg-gray-100  items-center gap-1 shadow-sm">
                <option>All </option>
                <option>Active </option>
                <option>Pending </option>
                <option>inactive </option>
              </select>
            </div>
          </div>

          {/* Table */}
          <table className="w-full ">
            <thead className="">
              <tr className="text-left text-sm">
                <th className="pb-3">Name</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Contact</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Hours This Week</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="text-gray-800">
              {ourEmpolyees.map((emp, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 border-b border-gray-300"
                >
                  <td className="py-4">
                    <p className="font-semibold">{emp.name}</p>
                    <div className="flex gap-1">
                      <MapPin className="w-3" />
                      <p className="text-sm text-gray-500">Downtown</p>
                    </div>
                  </td>

                  <td>
                    <span className="px-3 py-1 text-sm bg-gray-100 rounded-full">
                      {emp.role}
                    </span>
                  </td>

                  <td>
                    <p className="flex items-center gap-1 text-sm">
                      <Mail className="w-4" />
                      {emp.email}
                    </p>
                    <p className="flex items-center gap-1 text-sm">
                      <Phone className="w-4" />
                      {emp.phone}
                    </p>
                  </td>

                  <td>
                    <span className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full">
                      Active
                    </span>
                  </td>

                  <td>
                    <p className="font-semibold">0h</p>
                    <p className="text-sm text-gray-500">New</p>
                  </td>

                  <td className="text-right text-1xl font-bold">...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Employees;
