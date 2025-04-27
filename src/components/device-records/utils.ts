import type { DeviceDescriptionField, BaseDeviceRecordEntity } from '../../api/types';

/**
 * 格式化时间戳为日期时间字符串
 * @param timestamp 时间戳（毫秒）
 * @returns 格式化后的日期时间字符串
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  
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

/**
 * 解析设备记录的data字段
 * @param dataString data字段的JSON字符串
 * @returns 解析后的对象
 */
export function parseRecordData(dataString: string): Record<string, any> {
  try {
    return JSON.parse(dataString);
  } catch (e) {
    console.error('解析设备记录数据失败:', e);
    return {};
  }
}

/**
 * 根据设备描述字段列表查找字段的类型
 * @param fieldName 字段名称
 * @param descFields 设备描述字段列表
 * @returns 字段类型，默认为'string'
 */
export function getFieldType(fieldName: string, descFields: DeviceDescriptionField[]): 'number' | 'button' | 'bool' | 'string' {
  const field = descFields.find(field => field.name === fieldName);
  return field?.type || 'string';
}

/**
 * 提取指定字段的数据点列表
 * @param records 设备记录列表
 * @param fieldName 字段名称
 * @returns [时间戳, 值]数组
 */
export function extractDataPoints<T extends BaseDeviceRecordEntity>(
  records: T[], 
  fieldName: string
): [number, any][] {
  return records
    .map(record => {
      const data = parseRecordData(record.data);
      if (fieldName in data) {
        return [record.time, data[fieldName]];
      }
      return null;
    })
    .filter((point): point is [number, any] => point !== null);
}

/**
 * 获取记录中所有字段名称
 * @param records 设备记录列表
 * @returns 字段名称集合
 */
export function getAllFieldNames<T extends BaseDeviceRecordEntity>(records: T[]): string[] {
  const fieldSet = new Set<string>();
  
  records.forEach(record => {
    const data = parseRecordData(record.data);
    Object.keys(data).forEach(key => fieldSet.add(key));
  });
  
  return Array.from(fieldSet);
}

/**
 * 获取字段的显示名称
 * @param fieldName 字段名称
 * @param descFields 设备描述字段列表
 * @returns 字段的显示名称，如果没有则返回字段名称本身
 */
export function getFieldDisplayName(fieldName: string, descFields: DeviceDescriptionField[]): string {
  const field = descFields.find(field => field.name === fieldName);
  return field?.str || fieldName;
} 