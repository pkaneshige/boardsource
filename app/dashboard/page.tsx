import { Card, CardHeader, CardContent } from "@/components/ui/card";

const stats = [
  {
    title: "Total Users",
    value: "2,543",
    change: "+12%",
    changeType: "positive" as const,
  },
  {
    title: "Active Projects",
    value: "48",
    change: "+3",
    changeType: "positive" as const,
  },
  {
    title: "Revenue",
    value: "$45,231",
    change: "+8.2%",
    changeType: "positive" as const,
  },
  {
    title: "Pending Tasks",
    value: "12",
    change: "-5",
    changeType: "negative" as const,
  },
];

const recentActivity = [
  {
    id: 1,
    action: "New user registration",
    user: "John Doe",
    timestamp: "2 minutes ago",
  },
  {
    id: 2,
    action: "Project created",
    user: "Jane Smith",
    timestamp: "15 minutes ago",
  },
  {
    id: 3,
    action: "Invoice paid",
    user: "Acme Corp",
    timestamp: "1 hour ago",
  },
  {
    id: 4,
    action: "Task completed",
    user: "Bob Johnson",
    timestamp: "3 hours ago",
  },
  {
    id: 5,
    action: "Comment added",
    user: "Alice Williams",
    timestamp: "5 hours ago",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Here&apos;s what&apos;s happening with your projects today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <span
                  className={`text-sm font-medium ${
                    stat.changeType === "positive"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {stat.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity Section */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0 dark:border-gray-800"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{activity.action}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{activity.user}</p>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-500">
                  {activity.timestamp}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
