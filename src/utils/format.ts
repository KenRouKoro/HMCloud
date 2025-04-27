/**
 * 格式化文件大小
 * @param bytes 文件大小（字节）
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
}

/**
 * 格式化日期时间
 * @param dateString 日期字符串或时间戳
 * @returns 格式化后的日期时间字符串
 */
export function formatDate(dateString: string | number): string {
  const date = new Date(dateString);
  
  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    return '无效日期';
  }
  
  // 获取日期部分
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // 获取时间部分
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
} 