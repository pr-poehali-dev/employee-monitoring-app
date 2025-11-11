import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

type EmployeeStatus = 'active' | 'offline' | 'onBreak';

interface Employee {
  id: number;
  name: string;
  position: string;
  status: EmployeeStatus;
  checkInTime?: string;
  checkOutTime?: string;
  phone: string;
  hoursToday: number;
}

const initialEmployees: Employee[] = [
  {
    id: 1,
    name: 'Иван Петров',
    position: 'Прораб',
    status: 'active',
    checkInTime: '08:00',
    phone: '+7 (999) 123-45-67',
    hoursToday: 4.5,
  },
  {
    id: 2,
    name: 'Анна Сидорова',
    position: 'Инженер',
    status: 'active',
    checkInTime: '08:15',
    phone: '+7 (999) 234-56-78',
    hoursToday: 4.25,
  },
  {
    id: 3,
    name: 'Михаил Козлов',
    position: 'Монтажник',
    status: 'onBreak',
    checkInTime: '07:45',
    phone: '+7 (999) 345-67-89',
    hoursToday: 3.5,
  },
  {
    id: 4,
    name: 'Елена Волкова',
    position: 'Техник',
    status: 'offline',
    checkOutTime: '17:00',
    phone: '+7 (999) 456-78-90',
    hoursToday: 8,
  },
];

const Index = () => {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inputId, setInputId] = useState('');
  const [actionType, setActionType] = useState<'checkIn' | 'checkOut'>('checkIn');
  const { toast } = useToast();

  const getStatusBadge = (status: EmployeeStatus) => {
    const statusConfig = {
      active: { label: 'На объекте', variant: 'default' as const, color: 'bg-accent' },
      offline: { label: 'Ушёл', variant: 'secondary' as const, color: 'bg-muted' },
      onBreak: { label: 'Перерыв', variant: 'outline' as const, color: 'bg-yellow-100' },
    };
    return statusConfig[status];
  };

  const openCheckInDialog = () => {
    setActionType('checkIn');
    setInputId('');
    setIsDialogOpen(true);
  };

  const openCheckOutDialog = () => {
    setActionType('checkOut');
    setInputId('');
    setIsDialogOpen(true);
  };

  const handleSubmitId = () => {
    const employeeId = parseInt(inputId);
    const employee = employees.find(emp => emp.id === employeeId);

    if (!employee) {
      toast({
        title: 'Ошибка',
        description: 'Сотрудник с таким ID не найден',
        variant: 'destructive',
      });
      return;
    }

    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (actionType === 'checkIn') {
      setEmployees(prev =>
        prev.map(emp =>
          emp.id === employeeId ? { ...emp, status: 'active' as EmployeeStatus, checkInTime: time, checkOutTime: undefined } : emp
        )
      );
      toast({
        title: 'Приход отмечен',
        description: `${employee.name} прибыл на объект в ${time}`,
      });
    } else {
      setEmployees(prev =>
        prev.map(emp => (emp.id === employeeId ? { ...emp, status: 'offline' as EmployeeStatus, checkOutTime: time } : emp))
      );
      toast({
        title: 'Уход отмечен',
        description: `${employee.name} покинул объект в ${time}`,
      });
    }

    setIsDialogOpen(false);
    setInputId('');
  };

  const activeCount = employees.filter(e => e.status === 'active').length;
  const totalHours = employees.reduce((sum, e) => sum + e.hoursToday, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {actionType === 'checkIn' ? 'Отметить приход' : 'Отметить уход'}
            </DialogTitle>
            <DialogDescription>
              Введите ваш ID сотрудника для идентификации
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="number"
              placeholder="Введите ID (например: 1234)"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              className="text-lg h-12"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmitId();
                }
              }}
            />
            <div className="text-sm text-muted-foreground">
              Доступные ID для теста: 1, 2, 3, 4
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
              Отмена
            </Button>
            <Button onClick={handleSubmitId} className="flex-1">
              Подтвердить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-primary text-primary-foreground p-6 pb-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Контроль объекта</h1>
            <p className="text-sm opacity-90">Управление сотрудниками</p>
          </div>
          <Button variant="secondary" size="icon" className="rounded-full">
            <Icon name="Settings" size={20} />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button
            size="lg"
            onClick={openCheckInDialog}
            className="bg-white/95 hover:bg-white text-primary h-auto py-4 flex flex-col gap-2 shadow-sm"
          >
            <Icon name="LogIn" size={28} />
            <span className="font-semibold">Отметить приход</span>
          </Button>
          <Button
            size="lg"
            onClick={openCheckOutDialog}
            variant="destructive"
            className="h-auto py-4 flex flex-col gap-2 shadow-sm"
          >
            <Icon name="LogOut" size={28} />
            <span className="font-semibold">Отметить уход</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-white/95 border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-accent/10 p-3 rounded-lg">
                  <Icon name="Users" size={24} className="text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                  <p className="text-xs text-muted-foreground">На объекте</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Icon name="Clock" size={24} className="text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalHours.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Часов сегодня</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="px-4 -mt-4">
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4 bg-card shadow-sm">
            <TabsTrigger value="list" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Icon name="List" size={18} className="mr-2" />
              Список
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Icon name="User" size={18} className="mr-2" />
              Профиль
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-3 animate-fade-in">
            {employees.map(employee => {
              const statusConfig = getStatusBadge(employee.status);
              return (
                <Card
                  key={employee.id}
                  className="shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4"
                  style={{ borderLeftColor: employee.status === 'active' ? 'hsl(var(--accent))' : 'hsl(var(--muted))' }}
                  onClick={() => setSelectedEmployee(employee)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-border">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {employee.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-base">{employee.name}</h3>
                          <p className="text-sm text-muted-foreground">{employee.position}</p>
                        </div>
                      </div>
                      <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                      {employee.checkInTime && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Icon name="LogIn" size={16} />
                          <span>{employee.checkInTime}</span>
                        </div>
                      )}
                      {employee.checkOutTime && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Icon name="LogOut" size={16} />
                          <span>{employee.checkOutTime}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      ID сотрудника: {employee.id}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="profile" className="animate-fade-in">
            {selectedEmployee ? (
              <Card className="shadow-lg">
                <CardHeader className="bg-primary/5">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 border-4 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                        {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-2xl mb-1">{selectedEmployee.name}</CardTitle>
                      <p className="text-muted-foreground">{selectedEmployee.position}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Icon name="Phone" size={18} />
                      Контакты
                    </h3>
                    <a href={`tel:${selectedEmployee.phone}`} className="text-primary font-medium">
                      {selectedEmployee.phone}
                    </a>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Icon name="BarChart3" size={18} />
                      Статистика за сегодня
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-secondary p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Часов на объекте</p>
                        <p className="text-2xl font-bold">{selectedEmployee.hoursToday}</p>
                      </div>
                      <div className="bg-secondary p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Статус</p>
                        <Badge className={getStatusBadge(selectedEmployee.status).color}>
                          {getStatusBadge(selectedEmployee.status).label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Icon name="Clock" size={18} />
                      Время работы
                    </h3>
                    <div className="space-y-2">
                      {selectedEmployee.checkInTime && (
                        <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                          <span className="text-sm text-muted-foreground">Приход</span>
                          <span className="font-semibold">{selectedEmployee.checkInTime}</span>
                        </div>
                      )}
                      {selectedEmployee.checkOutTime && (
                        <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                          <span className="text-sm text-muted-foreground">Уход</span>
                          <span className="font-semibold">{selectedEmployee.checkOutTime}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-sm">
                <CardContent className="p-12 text-center">
                  <Icon name="UserCircle" size={64} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Выберите сотрудника из списка</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;