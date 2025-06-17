import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { serviceTemplateApi } from '../lib/api';

export type ServiceTemplate = {
  id: number;
  name: string;
  color: string;
  duration: number; // v hodinách
  price: number;
  description?: string;
};

const colorOptions = [
  { value: 'blue', label: 'Modrá', bg: 'bg-blue-100', text: 'text-blue-800' },
  { value: 'green', label: 'Zelená', bg: 'bg-green-100', text: 'text-green-800' },
  { value: 'purple', label: 'Fialová', bg: 'bg-purple-100', text: 'text-purple-800' },
  { value: 'red', label: 'Červená', bg: 'bg-red-100', text: 'text-red-800' },
  { value: 'yellow', label: 'Žltá', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  { value: 'pink', label: 'Ružová', bg: 'bg-pink-100', text: 'text-pink-800' },
  { value: 'indigo', label: 'Indigová', bg: 'bg-indigo-100', text: 'text-indigo-800' },
  { value: 'orange', label: 'Oranžová', bg: 'bg-orange-100', text: 'text-orange-800' },
  { value: 'teal', label: 'Tyrkysová', bg: 'bg-teal-100', text: 'text-teal-800' },
  { value: 'cyan', label: 'Azúrová', bg: 'bg-cyan-100', text: 'text-cyan-800' },
  { value: 'lime', label: 'Limetková', bg: 'bg-lime-100', text: 'text-lime-800' },
  { value: 'emerald', label: 'Smaragdová', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  { value: 'violet', label: 'Fialková', bg: 'bg-violet-100', text: 'text-violet-800' },
  { value: 'fuchsia', label: 'Fuchsiová', bg: 'bg-fuchsia-100', text: 'text-fuchsia-800' },
  { value: 'rose', label: 'Ružička', bg: 'bg-rose-100', text: 'text-rose-800' },
  { value: 'sky', label: 'Nebeská', bg: 'bg-sky-100', text: 'text-sky-800' },
  { value: 'amber', label: 'Jantárová', bg: 'bg-amber-100', text: 'text-amber-800' },
  { value: 'slate', label: 'Bridlicová', bg: 'bg-slate-100', text: 'text-slate-800' },
  { value: 'gray', label: 'Sivá', bg: 'bg-gray-100', text: 'text-gray-800' },
  { value: 'stone', label: 'Kamenná', bg: 'bg-stone-100', text: 'text-stone-800' },
];

const ServicesManagement = () => {
  const { token } = useAuth();
  const [services, setServices] = useState<ServiceTemplate[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<ServiceTemplate>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Načítanie služieb pri načítaní komponenty
  useEffect(() => {
    const loadServices = async () => {
      if (!token) return;
      
      setLoading(true);
      try {
        const response = await serviceTemplateApi.list(token);
        if (response.success) {
          setServices(response.data);
        }
      } catch (error) {
        console.error('Error loading services:', error);
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, [token]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === 'duration' || name === 'price' ? parseFloat(value) || 0 : value });
  };

  const handleAdd = () => {
    setForm({});
    setEditId(null);
    setShowModal(true);
  };

  const handleEdit = (service: ServiceTemplate) => {
    setForm(service);
    setEditId(service.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Ste si istí, že chcete zmazať túto službu?') && token) {
      setLoading(true);
      try {
        const response = await serviceTemplateApi.delete(token, id);
        if (response.success) {
          setServices(services.filter(s => s.id !== id));
        }
      } catch (error) {
        console.error('Error deleting service template:', error);
        alert('Chyba pri mazaní služby');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.color || !form.duration || !form.price || !token) return;
    
    setLoading(true);
    try {
      if (editId) {
        const response = await serviceTemplateApi.update(token, editId, form);
        if (response.success) {
          setServices(services.map(s => s.id === editId ? response.data : s));
        }
      } else {
        const response = await serviceTemplateApi.create(token, form);
        if (response.success) {
          setServices([...services, response.data]);
        }
      }
      
      setShowModal(false);
      setForm({});
      setEditId(null);
    } catch (error) {
      console.error('Error saving service template:', error);
      alert('Chyba pri ukladaní služby');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setForm({});
    setEditId(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Moje služby</h3>
          <button
            onClick={handleAdd}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
          >
            <FaPlus className="mr-2" />
            Pridať službu
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Názov</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farba</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trvanie</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cena</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Popis</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akcie</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {services.map((service) => (
              <tr key={service.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{service.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    colorOptions.find(c => c.value === service.color)?.bg || 'bg-gray-100'
                  } ${
                    colorOptions.find(c => c.value === service.color)?.text || 'text-gray-800'
                  }`}>
                    {colorOptions.find(c => c.value === service.color)?.label || service.color}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {service.duration}h
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {service.price}€
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                  <div className="truncate">{service.description || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleEdit(service)}
                      className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                      title="Upraviť"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="text-red-600 hover:text-red-900 p-1 rounded"
                      title="Zmazať"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {services.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">Žiadne služby</h3>
            <p className="text-sm text-gray-500">Začnite pridaním novej služby.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {editId ? 'Upraviť službu' : 'Nová služba'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Názov služby
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name || ''}
                  onChange={handleInput}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Zadajte názov služby"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Farba služby
                </label>
                <select
                  name="color"
                  value={form.color || ''}
                  onChange={handleInput}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="">Vyberte farbu</option>
                  {colorOptions.map(color => (
                    <option key={color.value} value={color.value}>
                      {color.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trvanie (hodiny)
                </label>
                <input
                  type="number"
                  name="duration"
                  min="1"
                  max="8"
                  step="0.5"
                  value={form.duration || ''}
                  onChange={handleInput}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cena (€)
                </label>
                <input
                  type="number"
                  name="price"
                  min="0"
                  step="0.01"
                  value={form.price || ''}
                  onChange={handleInput}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Popis (voliteľné)
                </label>
                <textarea
                  name="description"
                  value={form.description || ''}
                  onChange={handleInput}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Stručný popis služby..."
                />
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Ukladám...' : (editId ? 'Uložiť zmeny' : 'Pridať službu')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesManagement; 