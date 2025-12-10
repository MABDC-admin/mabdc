import { useState, useRef, useCallback } from 'react';
import { 
  Folder, 
  FileText, 
  FileImage, 
  FileSpreadsheet,
  File,
  Plus,
  Upload,
  ChevronRight,
  Home,
  MoreVertical,
  Pencil,
  Trash2,
  FolderPlus,
  UserPlus,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useSubFolders,
  useCompanyFiles,
  useCreateFolder,
  useRenameFolder,
  useDeleteFolder,
  useMoveFolder,
  useUploadCompanyFile,
  useRenameFile,
  useDeleteFile,
  useMoveFile,
  CompanyFolder,
  CompanyFile,
} from '@/hooks/useCompanyDocs';
import { useEmployees } from '@/hooks/useEmployees';
import { useUploadDocument } from '@/hooks/useDocuments';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ImagePreviewModal } from '@/components/modals/ImagePreviewModal';

export function CompanyDocsView() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'Root' }
  ]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: 'folder' | 'file'; item: CompanyFolder | CompanyFile } | null>(null);
  
  // Dialog states
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addToEmployeeOpen, setAddToEmployeeOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: folders = [], isLoading: foldersLoading } = useSubFolders(currentFolderId);
  const { data: files = [], isLoading: filesLoading } = useCompanyFiles(currentFolderId);
  const { data: employees = [] } = useEmployees();
  
  const createFolder = useCreateFolder();
  const renameFolder = useRenameFolder();
  const deleteFolder = useDeleteFolder();
  const moveFolder = useMoveFolder();
  const uploadFile = useUploadCompanyFile();
  const renameFile = useRenameFile();
  const deleteFile = useDeleteFile();
  const moveFile = useMoveFile();
  const uploadToEmployee = useUploadDocument();

  const navigateToFolder = (folderId: string | null, folderName: string) => {
    if (folderId === null) {
      setFolderPath([{ id: null, name: 'Root' }]);
    } else {
      const existingIndex = folderPath.findIndex(p => p.id === folderId);
      if (existingIndex >= 0) {
        setFolderPath(folderPath.slice(0, existingIndex + 1));
      } else {
        setFolderPath([...folderPath, { id: folderId, name: folderName }]);
      }
    }
    setCurrentFolderId(folderId);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder.mutate(
      { name: newFolderName.trim(), parentId: currentFolderId },
      {
        onSuccess: () => {
          setNewFolderOpen(false);
          setNewFolderName('');
        }
      }
    );
  };

  const handleRename = () => {
    if (!selectedItem || !renameValue.trim()) return;
    
    if (selectedItem.type === 'folder') {
      renameFolder.mutate(
        { id: selectedItem.item.id, name: renameValue.trim() },
        { onSuccess: () => { setRenameOpen(false); setSelectedItem(null); } }
      );
    } else {
      renameFile.mutate(
        { id: selectedItem.item.id, name: renameValue.trim() },
        { onSuccess: () => { setRenameOpen(false); setSelectedItem(null); } }
      );
    }
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    
    if (selectedItem.type === 'folder') {
      deleteFolder.mutate(selectedItem.item.id, {
        onSuccess: () => { setDeleteOpen(false); setSelectedItem(null); }
      });
    } else {
      const file = selectedItem.item as CompanyFile;
      deleteFile.mutate(
        { id: file.id, fileUrl: file.file_url },
        { onSuccess: () => { setDeleteOpen(false); setSelectedItem(null); } }
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      uploadFile.mutate({ file, folderId: currentFolderId });
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      Array.from(files).forEach(file => {
        uploadFile.mutate({ file, folderId: currentFolderId });
      });
    }
  }, [currentFolderId, uploadFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const openFile = (file: CompanyFile) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    
    if (imageExts.includes(ext || '')) {
      setPreviewUrl(file.file_url);
      setPreviewTitle(file.name);
      setPreviewOpen(true);
    } else {
      window.open(file.file_url, '_blank');
    }
  };

  const handleAddToEmployee = async () => {
    if (!selectedItem || selectedItem.type !== 'file' || !selectedEmployee) return;
    
    const companyFile = selectedItem.item as CompanyFile;
    
    try {
      // Fetch the file from the URL
      const response = await fetch(companyFile.file_url);
      const blob = await response.blob();
      const fileBlob = new Blob([blob], { type: companyFile.file_type });
      const newFile = Object.assign(fileBlob, { name: companyFile.name }) as File;
      
      uploadToEmployee.mutate(
        { file: newFile, employeeId: selectedEmployee, category: 'Other' },
        {
          onSuccess: () => {
            setAddToEmployeeOpen(false);
            setSelectedItem(null);
            setSelectedEmployee('');
          }
        }
      );
    } catch (error) {
      toast.error('Failed to add file to employee documents');
    }
  };

  const getFileIcon = (fileType: string, fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    if (fileType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <FileImage className="w-8 h-8 text-green-500" />;
    }
    if (fileType.includes('pdf') || ext === 'pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    if (fileType.includes('spreadsheet') || fileType.includes('excel') || ['xlsx', 'xls', 'csv'].includes(ext || '')) {
      return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
    }
    if (fileType.includes('word') || fileType.includes('document') || ['doc', 'docx'].includes(ext || '')) {
      return <FileText className="w-8 h-8 text-blue-500" />;
    }
    return <File className="w-8 h-8 text-muted-foreground" />;
  };

  const isLoading = foldersLoading || filesLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Company Documents</h1>
          <p className="text-muted-foreground">Manage company files and folders</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setNewFolderOpen(true)}
            className="gap-2"
          >
            <FolderPlus className="w-4 h-4" />
            New Folder
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
            <Upload className="w-4 h-4" />
            Upload Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm bg-muted/50 rounded-lg px-4 py-2 overflow-x-auto">
        {folderPath.map((folder, index) => (
          <div key={folder.id || 'root'} className="flex items-center gap-1 shrink-0">
            {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <button
              onClick={() => navigateToFolder(folder.id, folder.name)}
              className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors ${
                index === folderPath.length - 1 ? 'font-medium text-primary' : 'text-muted-foreground'
              }`}
            >
              {index === 0 && <Home className="w-4 h-4" />}
              {folder.name}
            </button>
          </div>
        ))}
      </div>

      {/* File Explorer */}
      <div
        className={`glass-card rounded-xl border border-border p-6 min-h-[400px] transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : ''
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Folder className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">This folder is empty</p>
            <p className="text-sm">Create a folder or drag files here to upload</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Folders */}
            {folders.map(folder => (
              <div
                key={folder.id}
                className="group relative flex flex-col items-center p-4 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onDoubleClick={() => navigateToFolder(folder.id, folder.name)}
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigateToFolder(folder.id, folder.name)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedItem({ type: 'folder', item: folder });
                        setRenameValue(folder.name);
                        setRenameOpen(true);
                      }}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => {
                          setSelectedItem({ type: 'folder', item: folder });
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Folder className="w-12 h-12 text-yellow-500 mb-2" />
                <span className="text-sm text-center font-medium truncate w-full">{folder.name}</span>
              </div>
            ))}

            {/* Files */}
            {files.map(file => (
              <div
                key={file.id}
                className="group relative flex flex-col items-center p-4 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onDoubleClick={() => openFile(file)}
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openFile(file)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedItem({ type: 'file', item: file });
                        setRenameValue(file.name);
                        setRenameOpen(true);
                      }}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedItem({ type: 'file', item: file });
                        setAddToEmployeeOpen(true);
                      }}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add to Employee
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => {
                          setSelectedItem({ type: 'file', item: file });
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {getFileIcon(file.file_type, file.name)}
                <span className="text-sm text-center truncate w-full mt-2">{file.name}</span>
                {file.file_size && (
                  <span className="text-xs text-muted-foreground">{file.file_size}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {selectedItem?.type === 'folder' ? 'Folder' : 'File'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="New name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedItem?.type === 'folder' ? 'Folder' : 'File'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete "{selectedItem?.item.name}"?
              {selectedItem?.type === 'folder' && ' This will also delete all contents inside.'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Employee Dialog */}
      <Dialog open={addToEmployeeOpen} onOpenChange={setAddToEmployeeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Employee Documents</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Select an employee to add "{selectedItem?.item.name}" to their documents.
            </p>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.hrms_no})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToEmployeeOpen(false)}>Cancel</Button>
            <Button onClick={handleAddToEmployee} disabled={!selectedEmployee}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        imageUrl={previewUrl}
        title={previewTitle}
      />
    </div>
  );
}
