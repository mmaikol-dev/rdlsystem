import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Clock3, PhoneCall, PhoneMissed, Users } from 'lucide-react';
import * as React from 'react';

type Session = {
  id: number;
  name: string;
  status: string | null;
  client_name: string | null;
  last_seen: number | null;
};

type Agent = {
  id: number;
  name: string;
} | null;

type CallLogRow = {
  id: number;
  session_id: string | null;
  provider_session_id: string | null;
  direction: 'inbound' | 'outbound';
  from_number: string | null;
  to_number: string | null;
  status: string;
  is_missed: boolean;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
  agent?: Agent;
};

type PaginatedLogs = {
  data: CallLogRow[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
};

type LogsFilters = {
  direction: string;
  status: string;
  q: string;
  per_page: number;
};

type Summary = {
  total: number;
  active: number;
  missed: number;
  completed_today: number;
};

type Props = {
  logs: PaginatedLogs;
  filters: LogsFilters;
  summary: Summary;
  sessions: Session[];
};

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Call Center', href: '/voice' },
  { title: 'Call Logs & Sessions', href: '/voice/logs' },
];

export default function VoiceLogsPage({ logs, filters, summary, sessions }: Props) {
  const [search, setSearch] = React.useState(filters.q || '');
  const [direction, setDirection] = React.useState(filters.direction || 'all');
  const [status, setStatus] = React.useState(filters.status || 'all');
  const [perPage, setPerPage] = React.useState(String(filters.per_page || 15));
  const [sessionSearch, setSessionSearch] = React.useState('');
  const [sessionStatus, setSessionStatus] = React.useState<'all' | 'available' | 'busy' | 'away' | 'offline' | 'on_call'>('all');
  const [sessionsPerPage, setSessionsPerPage] = React.useState(15);
  const [sessionsPage, setSessionsPage] = React.useState(1);

  const applyFilters = (page = 1) => {
    router.get(
      '/voice/logs',
      {
        q: search || undefined,
        direction: direction === 'all' ? undefined : direction,
        status: status === 'all' ? undefined : status,
        per_page: Number(perPage),
        page,
      },
      { preserveState: true, preserveScroll: true, replace: true },
    );
  };

  const clearFilters = () => {
    setSearch('');
    setDirection('all');
    setStatus('all');
    setPerPage('15');
    router.get('/voice/logs', {}, { preserveState: true, preserveScroll: true, replace: true });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredSessions = React.useMemo(() => {
    return sessions.filter((session) => {
      const matchesStatus = sessionStatus === 'all' || (session.status || 'offline') === sessionStatus;
      const q = sessionSearch.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        session.name.toLowerCase().includes(q) ||
        (session.client_name || '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [sessions, sessionStatus, sessionSearch]);

  const sessionsLastPage = Math.max(1, Math.ceil(filteredSessions.length / sessionsPerPage));
  const normalizedSessionsPage = Math.min(sessionsPage, sessionsLastPage);
  const paginatedSessions = filteredSessions.slice(
    (normalizedSessionsPage - 1) * sessionsPerPage,
    normalizedSessionsPage * sessionsPerPage,
  );

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Call Logs & Sessions" />

      <div className="w-full space-y-6 px-3 pb-8 pt-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Calls</CardDescription>
              <CardTitle className="text-2xl">{summary.total}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground"><PhoneCall className="h-4 w-4" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Calls</CardDescription>
              <CardTitle className="text-2xl">{summary.active}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground"><Activity className="h-4 w-4" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Missed Calls</CardDescription>
              <CardTitle className="text-2xl">{summary.missed}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground"><PhoneMissed className="h-4 w-4" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed Today</CardDescription>
              <CardTitle className="text-2xl">{summary.completed_today}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground"><Clock3 className="h-4 w-4" /></CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Call Logs</CardTitle>
                <CardDescription>Track all inbound and outbound call activity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <Input
                    placeholder="Search number/session..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyFilters(1);
                    }}
                  />
                  <Select value={direction} onValueChange={setDirection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Directions</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                      <SelectItem value="outbound">Outbound</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="initiated">Initiated</SelectItem>
                      <SelectItem value="ringing">Ringing</SelectItem>
                      <SelectItem value="connected">Connected</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="missed">Missed</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Select value={perPage} onValueChange={setPerPage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Rows" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => applyFilters(1)}>Apply</Button>
                    <Button variant="outline" onClick={clearFilters}>Clear</Button>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Session</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No call logs found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.data.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.direction}</Badge>
                          </TableCell>
                          <TableCell>{log.from_number || '-'}</TableCell>
                          <TableCell>{log.to_number || '-'}</TableCell>
                          <TableCell>{log.agent?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                log.status === 'completed'
                                  ? 'default'
                                  : log.status === 'failed' || log.status === 'missed'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                            >
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDuration(log.duration_seconds || 0)}</TableCell>
                          <TableCell className="max-w-[220px] truncate">{log.session_id || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing page {logs.current_page} of {logs.last_page} ({logs.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={logs.current_page <= 1}
                      onClick={() => applyFilters(logs.current_page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      disabled={logs.current_page >= logs.last_page}
                      onClick={() => applyFilters(logs.current_page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Active Sessions
                </CardTitle>
                <CardDescription>Current call center agent connection status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2">
                  <Input
                    placeholder="Search agent/client..."
                    value={sessionSearch}
                    onChange={(e) => {
                      setSessionSearch(e.target.value);
                      setSessionsPage(1);
                    }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={sessionStatus}
                      onValueChange={(value: 'all' | 'available' | 'busy' | 'away' | 'offline' | 'on_call') => {
                        setSessionStatus(value);
                        setSessionsPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="busy">Busy</SelectItem>
                        <SelectItem value="away">Away</SelectItem>
                        <SelectItem value="on_call">On Call</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(sessionsPerPage)}
                      onValueChange={(value) => {
                        setSessionsPerPage(Number(value));
                        setSessionsPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Rows" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filteredSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No call center sessions found.</p>
                ) : (
                  paginatedSessions.map((session) => (
                    <div key={session.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{session.name}</p>
                        <Badge variant={session.status === 'available' ? 'default' : 'secondary'}>
                          {session.status || 'offline'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Client: {session.client_name || 'Not initialized'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last seen:{' '}
                        {session.last_seen
                          ? new Date(session.last_seen * 1000).toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                  ))
                )}

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Page {normalizedSessionsPage} of {sessionsLastPage} ({filteredSessions.length} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={normalizedSessionsPage <= 1}
                      onClick={() => setSessionsPage((prev) => Math.max(1, prev - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={normalizedSessionsPage >= sessionsLastPage}
                      onClick={() => setSessionsPage((prev) => Math.min(sessionsLastPage, prev + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
