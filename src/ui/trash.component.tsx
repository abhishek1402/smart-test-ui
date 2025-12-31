import React, { useEffect, useState } from 'react';
import { highlight, languages } from 'prismjs';
import Editor from 'react-simple-code-editor';

interface TrashItem {
  _id: string;
  originalId: string;
  name: string;
  test: string;
  preTestId?: string;
  deletedAt: string;
  expiresAt: string;
}

export const TrashComponent = () => {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    fetchTrashItems();
  }, []);

  const fetchTrashItems = async () => {
    try {
      setIsInitialLoading(true);
      console.log('Fetching trash items...');
      const data = await window.ipcRender.invoke('getAllTrashItems');
      console.log('Received trash data:', data);
      
      if (Array.isArray(data)) {
        setTrashItems(data);
        console.log('Set trash items:', data.length, 'items');
      } else {
        console.error('Invalid trash data received:', data);
        setTrashItems([]);
      }
    } catch (error) {
      console.error('Error fetching trash items:', error);
      setTrashItems([]);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleRestore = async (trashId: string) => {
    try {
      setIsLoading(true);
      const result = await window.ipcRender.invoke('restoreTestCase', { trashId });
      if (result && result.success) {
        alert('Test case restored successfully');
        fetchTrashItems(); // Refresh the list
      } else {
        const message = result?.message || 'Failed to restore test case';
        alert('Error: ' + message);
      }
    } catch (error) {
      console.error('Error restoring test case:', error);
      alert('Error restoring test case: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermanentDelete = async (trashId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this test case? This action cannot be undone.')) {
      try {
        setIsLoading(true);
        const result = await window.ipcRender.invoke('permanentDeleteTestCase', { trashId });
        if (result && result.success) {
          alert('Test case permanently deleted');
          fetchTrashItems(); // Refresh the list
        } else {
          const message = result?.message || 'Failed to permanently delete test case';
          alert('Error: ' + message);
        }
      } catch (error) {
        console.error('Error permanently deleting test case:', error);
        alert('Error permanently deleting test case: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteAll = async () => {
    if (trashItems.length === 0) {
      alert('Trash is already empty');
      return;
    }
    
    if (window.confirm(`Are you sure you want to permanently delete ALL ${trashItems.length} test cases from trash? This action cannot be undone.`)) {
      try {
        setIsLoading(true);
        const result = await window.ipcRender.invoke('deleteAllTrashItems');
        if (result && result.success) {
          alert(`Successfully deleted ${result.deletedCount} test cases from trash`);
          fetchTrashItems(); // Refresh the list
        } else {
          const message = result?.message || 'Failed to delete all trash items';
          alert('Error: ' + message);
        }
      } catch (error) {
        console.error('Error deleting all trash items:', error);
        alert('Error deleting all trash items: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Fixed header section */}
      <div className="p-5 pb-0 flex-shrink-0">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Trash</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchTrashItems}
              disabled={isInitialLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:bg-gray-400"
            >
              {isInitialLoading ? 'Loading...' : 'Refresh'}
            </button>
            {trashItems.length > 0 && (
              <button
                onClick={handleDeleteAll}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm disabled:bg-gray-400 font-medium"
              >
                🗑️ Delete All ({trashItems.length})
              </button>
            )}
            <div className="bg-red-100 text-red-800 text-sm font-semibold px-3 py-1 rounded-lg">
              Total: {trashItems.length} deleted test case{trashItems.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-hidden px-5 pb-5">
        {isInitialLoading ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">⏳</div>
          <p className="text-gray-500">Loading trash items...</p>
        </div>
      ) : trashItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">🗑️</div>
          <p className="text-gray-500">No deleted test cases</p>
          <p className="text-sm text-gray-400 mt-2">Deleted test cases will appear here and be automatically removed after 7 days</p>
        </div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-900 uppercase bg-red-50 dark:bg-red-50 dark:text-gray-900 sticky top-0 z-10">
              <tr>
                <th scope="col" className="w-[5%] px-6 py-3 border border-gray-500">
                  Sl.No
                </th>
                <th scope="col" className="w-[10%] px-6 py-3 border border-gray-500">
                  Name
                </th>
                <th scope="col" className="w-[45%] px-6 py-3 border border-gray-500">
                  Test Case
                </th>
                <th scope="col" className="w-[10%] px-6 py-3 border border-gray-500">
                  Deleted At
                </th>
                <th scope="col" className="w-[12%] px-6 py-3 border border-gray-500">
                  Days Left
                </th>
                <th scope="col" className="w-[18%] px-6 py-3 border border-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {trashItems.map((item, index) => {
                console.log('Rendering trash item:', item);
                return (
                  <tr key={item._id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                    <td className="px-6 py-4 border border-gray-500 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 border border-gray-500 font-medium text-gray-900 dark:text-white">
                      {item.name || 'Unnamed Test'}
                    </td>
                    <td className="px-6 py-4 border border-gray-500">
                      <div className="h-[200px] overflow-y-auto sm:max-w-[400px] md:max-w-[500px] lg:max-w-[600px] xl:max-w-[700px] 2xl:max-w-[900px]">
                        {item.test ? (
                          <Editor
                            className=""
                            value={item.test}
                            onValueChange={(code) => {}}
                            highlight={(code) => highlight(code, languages.js, 'js')}
                            padding={10}
                            style={{
                              fontFamily: '"Fira code", "Fira Mono", monospace',
                              fontSize: 12,
                            }}
                            disabled={true}
                          />
                        ) : (
                          <div className="text-gray-400 p-2">No test content</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 border border-gray-500 text-gray-600">
                      {item.deletedAt ? formatDate(item.deletedAt) : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 border border-gray-500">
                      {item.expiresAt ? (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          getDaysRemaining(item.expiresAt) <= 1
                            ? 'bg-red-100 text-red-800'
                            : getDaysRemaining(item.expiresAt) <= 3
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {getDaysRemaining(item.expiresAt)} days
                        </span>
                      ) : (
                        <span className="text-gray-400">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 border border-gray-500">
                      <div className="flex space-x-2">
                        <button
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs disabled:bg-gray-400"
                          disabled={isLoading}
                          onClick={() => handleRestore(item._id)}
                        >
                          Restore
                        </button>
                        <button
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs disabled:bg-gray-400"
                          disabled={isLoading}
                          onClick={() => handlePermanentDelete(item._id)}
                        >
                          Delete Forever
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};